import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoiYXRtb3N5dngiLCJhIjoiY21mc25ucW51MDhsYTJtb21oY3libWRpZSJ9.Aw4sr3YSsuIMM_kDh0J5hg";

// Backend base URL (configure via frontend/.env.local -> VITE_BACKEND_URL=http://127.0.0.1:8000)
const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

function App() {
  // --- State ---
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("PHP");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState({});
  const [zipCode, setZipCode] = useState("77005");
  const [isLocationSidebarOpen, setIsLocationSidebarOpen] = useState(true);
  const [isCurrencySidebarOpen, setIsCurrencySidebarOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipMessage, setZipMessage] = useState("");
  const [optimizationResult, setOptimizationResult] = useState("");
  const [aiBestBrand, setAiBestBrand] = useState("");
  const [aiBestBizId, setAiBestBizId] = useState(null);
  const [brandConfig, setBrandConfig] = useState({ brands: [], aliases: {}, search_terms: [] });
  const [aiOptions, setAiOptions] = useState([]);
  const markerRefs = useRef([]);

  // --- Map setup ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // Fetch available currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch("https://api.frankfurter.app/currencies");
        const data = await response.json();
        setCurrencies(data);
      } catch (error) {
        console.error("Could not fetch currencies:", error);
      }
    };
    fetchCurrencies();
  }, []);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapboxgl.accessToken || !mapContainerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-95.39, 29.71],
      zoom: 12,
    });
  }, []);

  // Fetch competitor brands + alias rules from backend
  useEffect(() => {
    const loadBrandConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rates/brands-config`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && (data.brands || data.aliases)) setBrandConfig({
          brands: Array.isArray(data.brands) ? data.brands : [],
          aliases: data.aliases || {},
          search_terms: Array.isArray(data.search_terms) ? data.search_terms : [],
        });
      } catch (_) {
        // ignore
      }
    };
    loadBrandConfig();
  }, []);

  // Helper to canonicalize brand names for matching/highlighting
  const canonicalBrand = (name = "") => {
    const n = (name || "").toLowerCase();
    if (n.includes("western union")) return "western union";
    if (n.includes("moneygram")) return "moneygram";
    if (n.includes("remitly")) return "remitly";
    if (n.includes("transferwise") || n === "wise" || n.includes("wise")) return "wise";
    if (n.includes("ria")) return "ria";
    if (n.includes("xoom")) return "xoom";
    if (n.includes("worldremit")) return "worldremit";
    if (n.includes("ofx") || n.includes("ozforex")) return "ofx";
    if (n.includes("small world")) return "small world";
    if (n.includes("walmart2walmart") || n.includes("walmart 2 walmart") || n.includes("walmart to walmart")) return "walmart2walmart";
    if (n.includes("finance connect")) return "finance connect";
    return n.trim();
  };

  // Map a free-form label to a known brand name (used across matching, AI inputs, and UI)
  const aliasRules = [
    { match: 'western union agent', brand: 'Western Union' },
    { match: 'walmart money center', brand: 'Western Union' },
    { match: 'walmart moneycenter', brand: 'Western Union' },
    { match: 'kroger money services', brand: 'Western Union' },
    { match: '7-eleven', brand: 'Western Union' },
    { match: 'check cashing', brand: 'Western Union' },
    { match: 'western union', brand: 'Western Union' },
    { match: 'moneygram', brand: 'MoneyGram' },
    { match: 'ace cash express', brand: 'MoneyGram' },
    { match: 'cvs', brand: 'MoneyGram' },
    { match: 'remitly', brand: 'Remitly' },
    { match: 'wise', brand: 'Wise' },
    { match: 'transferwise', brand: 'Wise' },
    { match: 'ria money transfer', brand: 'Ria' },
    { match: 'ria', brand: 'Ria' },
    { match: 'xoom', brand: 'Xoom' },
  ];
  const brandFromLabel = (label = '') => {
    const s = (label || '').toLowerCase();
    // Prefer dynamic rules from backend
    const aliases = brandConfig && brandConfig.aliases ? brandConfig.aliases : null;
    if (aliases && Object.keys(aliases).length) {
      for (const [match, brand] of Object.entries(aliases)) {
        if (s.includes(match)) return brand;
      }
    }
    // Fallback to static local rules
    for (const r of aliasRules) {
      if (s.includes(r.match)) return r.brand;
    }
    return null;
  };

  // Render or re-render markers when businesses or AI best brand changes
  useEffect(() => {
    if (!mapRef.current) return;
    // Clear existing markers
    markerRefs.current.forEach((m) => {
      if (m && typeof m.remove === 'function') m.remove();
      else if (m && m.marker && typeof m.marker.remove === 'function') m.marker.remove();
    });
    markerRefs.current = [];

    const best = canonicalBrand(aiBestBrand);

    (businesses || []).forEach((biz, idx) => {
      const coords = biz?.geometry?.coordinates || biz?.center;
      if (!coords || coords.length < 2) return;

      const label = `${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`;
      const compName = canonicalBrand(biz?.competitor?.name || brandFromLabel(label) || "");
      let color = "#9ca3af"; // gray default
      if (biz?.competitor) color = "#3b82f6"; // blue if we have data
      const idKey = biz.id ?? `idx:${idx}`;
      if (best && compName && compName === best) {
        // If we picked a specific nearest business for the best brand, only highlight that one
        if (!aiBestBizId || idKey === aiBestBizId) {
          color = "#22c55e";
        }
      }

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; min-width: 220px;">
          <strong>${biz.text || "Location"}</strong>
          <div style="color:#555; margin: 4px 0;">${biz.properties?.address || biz.place_name || "Address not available"}</div>
          ${typeof biz.distance_km === 'number' ? `<div>📍 Distance: ${biz.distance_km.toFixed(2)} km</div>` : ''}
          ${biz.competitor ? `
            <div>💸 Fee: $${biz.competitor.fee}</div>
            <div>📈 Recipient Gets: ${biz.competitor.recipient_gets} ${toCurrency}</div>
          ` : `<div>No channel data</div>`}
          ${best && compName === best ? `<div style="margin-top:6px;color:#16a34a;">⭐ AI recommended brand</div>` : ""}
        </div>
      `;

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([coords[0], coords[1]])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(mapRef.current);

      markerRefs.current.push({ id: idKey, marker });
    });
  }, [businesses, aiBestBrand, aiBestBizId, toCurrency]);

  // Choose nearest business for the selected AI brand so only one marker is green
  useEffect(() => {
    const best = canonicalBrand(aiBestBrand);
    if (!best || !Array.isArray(businesses) || businesses.length === 0) {
      setAiBestBizId(null);
      return;
    }
    let nearest = null;
    let nearestDist = Infinity;
    businesses.forEach((biz, idx) => {
      const label = `${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`;
      const compName = canonicalBrand(biz?.competitor?.name || brandFromLabel(label) || "");
      if (compName === best) {
        const d = typeof biz.distance_km === 'number' ? biz.distance_km : Infinity;
        if (d < nearestDist) {
          nearestDist = d;
          nearest = biz.id ?? `idx:${idx}`;
        }
      }
    });
    if (nearest) {
      setAiBestBizId(nearest);
    } else {
      // Fallback: if AI chose a brand with no nearby store, pick the best available brand present
      if (Array.isArray(aiOptions) && aiOptions.length > 0) {
        try {
          const presentBrands = new Set(
            businesses.map((biz) => brandFromLabel(`${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`)).filter(Boolean)
          );
          const sortedOpts = [...aiOptions].sort((a, b) => (b.recipient_gets ?? 0) - (a.recipient_gets ?? 0));
          const fallback = sortedOpts.find((o) => presentBrands.has(o.name));
          if (fallback && fallback.name && fallback.name !== aiBestBrand) {
            setAiBestBrand(fallback.name);
          } else {
            setAiBestBizId(null);
          }
        } catch (_) {
          setAiBestBizId(null);
        }
      } else {
        setAiBestBizId(null);
      }
    }
  }, [aiBestBrand, businesses, aiOptions]);

  // When we have a specific green pick, zoom to it and open its popup
  useEffect(() => {
    if (!aiBestBizId || !Array.isArray(businesses) || !mapRef.current) return;
    let targetBiz = null;
    let targetIdx = -1;
    for (let i = 0; i < businesses.length; i++) {
      const idKey = businesses[i].id ?? `idx:${i}`;
      if (idKey === aiBestBizId) {
        targetBiz = businesses[i];
        targetIdx = i;
        break;
      }
    }
    if (!targetBiz) return;
    const coords = targetBiz?.geometry?.coordinates || targetBiz?.center;
    if (!coords || coords.length < 2) return;
    mapRef.current.flyTo({ center: [coords[0], coords[1]], zoom: 15, speed: 1.2, curve: 1 });
    // Open popup if marker exists
    const m = markerRefs.current.find((m) => m && m.id === aiBestBizId);
    if (m && m.marker && m.marker.togglePopup) {
      try { m.marker.togglePopup(); } catch (_) { /* noop */ }
    }
  }, [aiBestBizId]);

  // Currency Conversion
  const handleConversion = async () => {
    if (!amount || amount <= 0) return;
    if (fromCurrency === toCurrency) {
      setResult("Currencies must be different.");
      return;
    }
    setIsLoading(true);
    setResult("");
    setOptimizationResult("");
    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
      );
      const data = await response.json();
      const convertedAmount = data.rates[toCurrency];
      setResult(`${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`);
    } catch (error) {
      setResult("Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ZIP Code + Business Search
  const handleZipCodeSearch = async (e) => {
    e.preventDefault();
    if (!zipCode || !mapRef.current) return;
    setBusinesses([]);
    setZipMessage("");
    setZipLoading(true);

    try {
      const geoResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipCode}.json?access_token=${mapboxgl.accessToken}&country=US&types=postcode`
      );
      const geoData = await geoResponse.json();

      if (geoData.features && geoData.features.length > 0) {
        const coordinates = geoData.features[0].center;
        mapRef.current.flyTo({ center: coordinates, zoom: 12 });

        // Query Mapbox separately for each term to improve results
        const searchTerms = (brandConfig && Array.isArray(brandConfig.search_terms) && brandConfig.search_terms.length)
          ? brandConfig.search_terms
          : [
              // Default fallback
              "Western Union",
              "Western Union Agent",
              "MoneyGram",
              "Ria Money Transfer",
              "Remitly",
              "Wise",
              "Xoom",
              "Walmart MoneyCenter",
              "Walmart Money Center",
              "H-E-B",
              "Kroger Money Services",
              "ACE Cash Express",
              "7-Eleven",
              "CVS",
              "Walgreens",
              "Check cashing",
            ];

        const fetchBrandPOIs = async (brand) => {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            brand
          )}.json?access_token=${mapboxgl.accessToken}&proximity=${coordinates[0]},${coordinates[1]}&types=poi&country=US&autocomplete=false&limit=20`;
          const res = await fetch(url);
          if (!res.ok) return { features: [] };
          return res.json();
        };

        const results = await Promise.all(searchTerms.map((b) => fetchBrandPOIs(b)));
        let nearbyBusinesses = results
          .flatMap((r) => r.features || [])
          .filter((f) => Array.isArray(f.place_type) && f.place_type.includes("poi"));

        // Compute distance from ZIP centroid for each POI (Haversine)
        const toRad = (deg) => (deg * Math.PI) / 180;
        const haversineKm = (lon1, lat1, lon2, lat2) => {
          const R = 6371; // km
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };
        nearbyBusinesses = (nearbyBusinesses || []).map((b) => {
          const coords = b?.geometry?.coordinates || b?.center;
          let distance_km = null;
          if (coords && coords.length >= 2) {
            distance_km = haversineKm(coordinates[0], coordinates[1], coords[0], coords[1]);
          }
          return { ...b, distance_km };
        });

        // If still nothing, try a broader query as fallback
        if (nearbyBusinesses.length === 0) {
          const broadQueries = [
            "money transfer",
            "remittance",
            "wire transfer",
            "bank",
            "currency exchange"
          ];
          const broadResults = await Promise.all(
            broadQueries.map((q) =>
              fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                  q
                )}.json?access_token=${mapboxgl.accessToken}&proximity=${coordinates[0]},${coordinates[1]}&types=poi&country=US&autocomplete=false&limit=20`
              ).then((r) => (r.ok ? r.json() : { features: [] }))
            )
          );
          nearbyBusinesses = broadResults
            .flatMap((r) => r.features || [])
            .filter((f) => Array.isArray(f.place_type) && f.place_type.includes("poi"));
        }

        // Final fallback: drop the strict poi type filter
        if (nearbyBusinesses.length === 0) {
          const relaxedResults = await Promise.all(
            searchTerms.map((brand) =>
              fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(brand)}.json?access_token=${mapboxgl.accessToken}&proximity=${coordinates[0]},${coordinates[1]}&country=US&autocomplete=false&limit=20`
              ).then((r) => (r.ok ? r.json() : { features: [] }))
            )
          );
          nearbyBusinesses = relaxedResults.flatMap((r) => r.features || []);
        }

        // Deduplicate by id
        const seen = new Set();
        nearbyBusinesses = nearbyBusinesses.filter((f) => {
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });

        // Build canonical brand list for backend scoring using alias rules
        const storesForBackend = Array.from(new Set(
          (nearbyBusinesses || [])
            .map((b) => `${b.text || ''} ${b.properties?.category || ''} ${b.place_name || ''}`)
            .map((label) => brandFromLabel(label))
            .filter(Boolean)
        ));

        let channels = [];
        if (storesForBackend.length > 0) {
          const resp = await fetch(`${API_BASE}/api/rates/nearby-channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(amount),
              from_currency: fromCurrency,
              to_currency: toCurrency,
              stores: storesForBackend,
            }),
          });
          const data = await resp.json();
          channels = data.channels || [];
        }

        // Attach competitor info (if present) to each POI and sort by best recipient_gets
        const annotated = nearbyBusinesses.map((biz) => {
          const label = `${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`;
          const brandName = brandFromLabel(label); // Proper brand like 'Western Union'
          const match = brandName ? channels.find((c) => (c.name || '') === brandName) : null;
          return { ...biz, competitor: match || null, detectedBrand: brandName };
        });

        const sorted = annotated.sort((a, b) => {
          const ra = a.competitor?.recipient_gets ?? -Infinity;
          const rb = b.competitor?.recipient_gets ?? -Infinity;
          return rb - ra;
        });

        setBusinesses(sorted);
        setZipMessage(`${sorted.length} location(s) found`);

        // Fit map to show all found POIs, accounting for sidebars
        const bounds = new mapboxgl.LngLatBounds();
        (sorted || []).forEach((biz) => {
          const coords = biz?.geometry?.coordinates || biz?.center;
          if (coords && coords.length >= 2) bounds.extend([coords[0], coords[1]]);
        });
        if (!bounds.isEmpty()) {
          // Add padding so markers aren't hidden behind sidebars
          const leftPad = isLocationSidebarOpen ? 420 : 20;
          const rightPad = isCurrencySidebarOpen ? 420 : 20;
          mapRef.current.fitBounds(bounds, {
            padding: { top: 40, bottom: 40, left: leftPad, right: rightPad },
            maxZoom: 15,
            duration: 800,
          });
        }
      } else {
        setZipMessage("Could not find location for that ZIP code.");
      }
    } catch (error) {
      console.error("Geocoding or backend compare failed:", error);
      setZipMessage(`Search failed: ${error?.message || 'Network error'}`);
    }
    finally {
      setZipLoading(false);
    }
  };

  // AI Optimization (via backend proxy)
  const handleOptimize = async () => {
    if (!amount) return;
    setIsLoading(true);
    setOptimizationResult("🤖 AI is thinking...");

    const mockCompetitorData = {
      "Western Union": { fee: 5.99, rate_markup_percent: 5 },
      "MoneyGram": { fee: 4.99, rate_markup_percent: 4 },
      Remitly: { fee: 2.99, rate_markup_percent: 3 },
      "Finance Connect (Our Service)": { fee: 2.0, rate_markup_percent: 1.5 },
    };

    try {
      // Derive available brands and their minimum distances among current businesses
      const brandDistances = {};
      (businesses || []).forEach((biz) => {
        const label = `${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`;
        const brandName = (biz.competitor && biz.competitor.name) ? biz.competitor.name : brandFromLabel(label);
        if (!brandName) return;
        const d = typeof biz.distance_km === 'number' ? biz.distance_km : null;
        if (d == null) return;
        if (!(brandName in brandDistances) || d < brandDistances[brandName]) {
          brandDistances[brandName] = d;
        }
      });
      const availableBrands = Object.keys(brandDistances);

      const resp = await fetch(`${API_BASE}/api/ai/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          from_currency: fromCurrency,
          to_currency: toCurrency,
          competitor_data: mockCompetitorData,
          available_brands: availableBrands.length ? availableBrands : undefined,
          brand_distances_km: Object.keys(brandDistances).length ? brandDistances : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const msg = data?.detail || data?.error || resp.statusText || "Unknown error";
        setOptimizationResult(`AI error: ${msg}`);
        setAiOptions([]);
        return;
      }
      // Prefer precise computed best if present, otherwise use model text
      if (data?.best && data?.currency) {
        setAiBestBrand(data.best.name || "");
        setAiOptions(Array.isArray(data.options) ? data.options : []);
        setOptimizationResult(
          `Best: ${data.best.name}. Recipient gets ${data.best.recipient_gets} ${data.currency}. ` +
          (data.best.distance_km != null ? `Distance ~${data.best.distance_km} km` + (data.best.time_min != null ? ` (~${data.best.time_min} min). ` : '. ') : '') +
          `(Market rate: ${data.market_rate}, Our rate: ${data.our_rate})\n` +
          (data.recommendation || "")
        );
      } else {
        setAiBestBrand("");
        setAiOptions(Array.isArray(data.options) ? data.options : []);
        setOptimizationResult(data.recommendation || "No recommendation generated.");
      }
    } catch (error) {
      console.error("AI optimize error:", error);
      setOptimizationResult(
        `Could not get AI recommendation. ${error?.message || "Network error"}`
      );
      setAiOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Map Background */}
      <div ref={mapContainerRef} className="map-container" />

      {/* Toggle Buttons */}
      <button
        className="sidebar-toggle-btn left"
        onClick={() => setIsLocationSidebarOpen(!isLocationSidebarOpen)}
      >
        {isLocationSidebarOpen ? "‹" : "›"}
      </button>
      <button
        className="sidebar-toggle-btn right"
        onClick={() => setIsCurrencySidebarOpen(!isCurrencySidebarOpen)}
      >
        $
      </button>

      {/* Left Sidebar */}
      <div className={`sidebar left-sidebar ${isLocationSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <h1>Location Finder</h1>
          <form onSubmit={handleZipCodeSearch} className="input-group">
            <label htmlFor="zip-input">Search Houston ZIP Code</label>
            <div className="zip-search-wrapper">
              <input
                id="zip-input"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
              <button type="submit">Go</button>
            </div>
          </form>
          <hr className="divider" />
          <div className="business-list">
            <h3>Money Transfer Locations Nearby</h3>
            <p className="framework-note">Markers: green = AI pick, blue = priced, gray = no data</p>
            {zipLoading && <p>Searching nearby locations…</p>}
            {zipMessage && <p>{zipMessage}</p>}
            {businesses.length > 0 ? (
              <ul>
                {businesses.map((biz, idx) => (
                  <li key={biz.id || idx}>
                    <strong>{biz.text}</strong>
                    <p>{biz.properties?.address || biz.place_name || "Address not available"}</p>
                    {typeof biz.distance_km === 'number' && (
                      <p>📍 Distance: {biz.distance_km.toFixed(2)} km</p>
                    )}
                    {biz.competitor ? (
                      <p>
                        💸 Fee: ${biz.competitor.fee} | Recipient Gets:{" "}
                        {biz.competitor.recipient_gets} {toCurrency}
                      </p>
                    ) : (
                      <p>No rate data available</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No locations found. Try a new ZIP code.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className={`sidebar right-sidebar ${isCurrencySidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <h1>Currency Converter</h1>
          <div className="input-group">
            <label htmlFor="amount-input">Amount</label>
            <input
              id="amount-input"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="currency-selectors">
            <div className="input-group">
              <label htmlFor="from-currency">From</label>
              <select
                id="from-currency"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                {Object.entries(currencies).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="to-currency">To</label>
              <select
                id="to-currency"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                {Object.entries(currencies).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleConversion} disabled={isLoading}>
            {isLoading ? "Converting..." : "Convert"}
          </button>
          <div className="result-display">{result && <h2>{result}</h2>}</div>

          <hr className="divider" />
          <button onClick={handleOptimize} disabled={isLoading}>
            {isLoading ? "Optimizing..." : "🤖 Find Best Rate"}
          </button>
          <div className="optimization-result">
            {optimizationResult && <p>{optimizationResult}</p>}
            {aiOptions && aiOptions.length > 0 && (
              <div>
                <h4>Compared Options</h4>
                <ul>
                  {aiOptions.map((o, i) => (
                    <li key={`${o.name}-${i}`}>
                      {o.name}: Recipient {o.recipient_gets} {toCurrency}, Fee ${o.fee} ({o.fee_percent}){" "}
                      {typeof o.distance_km === 'number' ? `| Distance ${o.distance_km.toFixed(2)} km` : ''}
                      {typeof o.time_min === 'number' ? ` (~${o.time_min} min)` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
