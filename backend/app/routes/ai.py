from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from pathlib import Path
from decouple import AutoConfig
import httpx
from datetime import datetime

# Use exchange rate + competitor config from rates router
from app.routes.rates import exchange_service, COMPETITOR_DATA, _apply_overrides

router = APIRouter()


class OptimizeRequest(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    competitor_data: Optional[Dict[str, Dict[str, Any]]] = None
    # Optional: restrict to brands actually available nearby and their distances (km)
    available_brands: Optional[List[str]] = None
    brand_distances_km: Optional[Dict[str, float]] = None


class ChannelOption(BaseModel):
    name: str
    fee: float
    fee_percent: str
    exchange_rate: float
    recipient_gets: float
    distance_km: Optional[float] = None
    time_min: Optional[float] = None

class OptimizeResponse(BaseModel):
    recommendation: str
    model: str = "gemini-1.5-flash-latest"
    used_competitor_data: bool = False
    market_rate: float
    our_rate: float
    currency: str
    options: List[ChannelOption]
    best: ChannelOption


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_remittance(payload: OptimizeRequest):
    """
    Server-side proxy to call Google Gemini and return a recommendation text.
    Requires GEMINI_API_KEY (or GOOGLE_API_KEY) to be set in env.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    # Load API key from backend/.env regardless of current working directory
    env_loader = AutoConfig(search_path=str(Path(__file__).resolve().parents[2]))
    api_key = env_loader("GEMINI_API_KEY", default=None) or env_loader("GOOGLE_API_KEY", default=None)
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured: set GEMINI_API_KEY or GOOGLE_API_KEY")

    # Compute live rates and recipient amounts deterministically
    rates = await exchange_service.calculate_rates(
        payload.from_currency.upper(), payload.to_currency.upper()
    )
    market_rate = float(rates["market_rate"])  # base market rate
    our_rate = float(rates["our_rate"])        # our post-markup rate

    amount = float(payload.amount)
    # Our service numbers
    our_fee = amount * 0.015 + 2.0
    our_recipient_gets = (amount - our_fee) * our_rate

    # Build competitor options from COMPETITOR_DATA
    options: List[Dict[str, Any]] = []
    # Optionally restrict to available brands from caller
    comp_pool = COMPETITOR_DATA
    if payload.available_brands:
        allowed = set(b.strip().lower() for b in payload.available_brands if b and b.strip())
        comp_pool = {k: v for k, v in COMPETITOR_DATA.items() if v['brand'].strip().lower() in allowed}

    for name, data in comp_pool.items():
        # Apply corridor/amount overrides if configured
        markup, fixed_fee = _apply_overrides(data['brand'], payload.from_currency, payload.to_currency, amount, data['markup'], data['fixed_fee'])
        comp_fee = amount * markup + fixed_fee
        comp_rate = market_rate * (1 - markup)
        comp_gets = (amount - comp_fee) * comp_rate
        dist_km = None
        t_min = None
        if payload.brand_distances_km is not None:
            dist_km = payload.brand_distances_km.get(data['brand'])
            if dist_km is not None:
                # Rough local driving average: 40km/h
                t_min = round((dist_km / 40.0) * 60.0, 1)
        options.append({
            'name': data['brand'],
            'fee': round(comp_fee, 2),
            'fee_percent': f"{(comp_fee / amount) * 100:.2f}%",
            'exchange_rate': round(comp_rate, 6),
            'recipient_gets': round(comp_gets, 2),
            'distance_km': None if dist_km is None else round(dist_km, 2),
            'time_min': t_min,
        })

    # Add our service as well for transparency unless caller restricts to nearby brands
    if not payload.available_brands:
        options.append({
            'name': 'Finance Connect (Our Service)',
            'fee': round(our_fee, 2),
            'fee_percent': f"{(our_fee / amount) * 100:.2f}%",
            'exchange_rate': round(our_rate, 6),
            'recipient_gets': round(our_recipient_gets, 2),
        })

    # Determine best using a combined score of payout and proximity when distances are available
    best_option = None
    if options:
        any_distance = any(o.get('distance_km') is not None for o in options)
        if any_distance:
            # Normalize payout loss vs. distance and compute weighted score
            top_gets = max(o['recipient_gets'] for o in options)
            # Tunable weights: prioritize proximity a bit more than small payout differences
            loss_weight = 0.45
            distance_weight = 0.55
            distance_cap_km = 10.0  # cap normalization at 10km
            def combined_score(o):
                loss = 0.0 if top_gets <= 0 else (top_gets - o['recipient_gets']) / top_gets
                d = o.get('distance_km')
                dnorm = 1.0
                if d is not None:
                    dnorm = min(max(d, 0.0) / distance_cap_km, 1.0)
                # Missing distances are treated as medium distance
                else:
                    dnorm = 0.6
                return loss_weight * loss + distance_weight * dnorm
            best_option = min(options, key=combined_score)
        else:
            # Fallback to highest payout only
            best_option = max(options, key=lambda x: x['recipient_gets'])

    # Prepare a grounded prompt with actual numbers for a concise justification
    prompt = (
        f"Given these remittance options for sending {amount} {payload.from_currency} to {payload.to_currency} "
        f"with market_rate={market_rate} and computed effective rates, choose the option using this policy: "
        f"maximize recipient amount after fees and rate markup; if amounts are close, prefer shorter travel time/nearer distance. "
        f"Explain briefly (1–2 sentences).\n"
        f"Options (with distances/time if available): {options}. Computed best: {best_option['name'] if best_option else 'N/A'}"
    )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash-latest:generateContent"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )

        if resp.status_code != 200:
            # Try to expose upstream error details
            try:
                err_json = resp.json()
                msg = err_json.get("error", {}).get("message") or resp.text
            except Exception:
                msg = resp.text
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API error: {msg}")

        data = resp.json()
        recommendation = (
            data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
        ) or (
            (
                f"Best: {best_option['name']} with recipient_gets {best_option['recipient_gets']} {payload.to_currency}"
                + (f", distance {best_option['distance_km']} km (~{best_option['time_min']} min)" if best_option and best_option.get('distance_km') is not None else "")
                + "."
            ) if best_option else "No options available."
        )

        return OptimizeResponse(
            recommendation=recommendation,
            used_competitor_data=payload.competitor_data is not None,
            market_rate=round(market_rate, 6),
            our_rate=round(our_rate, 6),
            currency=payload.to_currency.upper(),
            options=[ChannelOption(**o) for o in options],
            best=ChannelOption(**best_option) if best_option else ChannelOption(
                name='N/A', fee=0, fee_percent='0%', exchange_rate=our_rate, recipient_gets=0.0
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI proxy failed: {e}")
