# app/services/fraud_detection.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
from datetime import datetime, timedelta

# simple risk weights you can tweak
AMOUNT_HI = 1500.0
WEIGHTS = {
    "amount": 30,
    "velocity": 25,
    "new_recipient": 15,
    "ip_mismatch": 10,
    "device_change": 10,
    "nighttime": 10,
    "corridor": 10,
}

RISKY_CORRIDORS = {("USD", "NGN"), ("USD", "INR")}  # example tweak freely

@dataclass
class TxSummary:
    count_24h: int = 0
    avg_7d: float = 0.0

def summarize_history(history: List[Dict], now: Optional[datetime] = None) -> TxSummary:
    """
    history: list of dicts with keys ['amount','created_at'] (UTC ISO str or datetime)
    """
    if not history:
        return TxSummary()
    now = now or datetime.utcnow()
    t24 = now - timedelta(hours=24)
    t7d = now - timedelta(days=7)

    cnt24 = 0
    sum7 = 0.0
    n7 = 0
    for h in history:
        ts = h.get("created_at")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                ts = now
        amt = float(h.get("amount", 0))
        if ts >= t24:
            cnt24 += 1
        if ts >= t7d:
            sum7 += amt
            n7 += 1
    return TxSummary(count_24h=cnt24, avg_7d=(sum7 / n7 if n7 else 0.0))

class FraudDetector:
    def assess(
        self,
        *,
        amount: float,
        from_currency: str,
        to_currency: str,
        is_new_recipient: bool,
        ip_country_mismatch: bool,
        device_change: bool,
        user_local_hour: int,
        history: Optional[List[Dict]] = None,
    ) -> Dict:
        hist = summarize_history(history or [])
        score = 0
        flags = []

        if amount >= AMOUNT_HI or amount > hist.avg_7d * 2.5 and hist.avg_7d > 0:
            score += WEIGHTS["amount"]; flags.append("high_amount")

        if hist.count_24h >= 3:
            score += WEIGHTS["velocity"]; flags.append("high_velocity_24h")

        if is_new_recipient:
            score += WEIGHTS["new_recipient"]; flags.append("new_recipient")

        if ip_country_mismatch:
            score += WEIGHTS["ip_mismatch"]; flags.append("ip_country_mismatch")

        if device_change:
            score += WEIGHTS["device_change"]; flags.append("new_device")

        if user_local_hour < 6 or user_local_hour >= 23:
            score += WEIGHTS["nighttime"]; flags.append("nighttime_activity")

        if (from_currency, to_currency) in RISKY_CORRIDORS:
            score += WEIGHTS["corridor"]; flags.append("risky_corridor")

        # clamp 0..100
        score = max(0, min(100, score))

        decision = "allow"
        if score >= 70:
            decision = "block"
        elif score >= 40:
            decision = "review"

        return {
            "score": score,
            "decision": decision,
            "flags": flags,
            "history": {"count_24h": hist.count_24h, "avg_7d": round(hist.avg_7d, 2)},
        }

fraud_detector = FraudDetector()
