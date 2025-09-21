import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoiYXRtb3N5dngiLCJhIjoiY21mc25ucW51MDhsYTJtb21oY3libWRpZSJ9.Aw4sr3YSsuIMM_kDh0J5hg";

// Backend base URL (configure via frontend/.env.local -> VITE_BACKEND_URL=http://127.0.0.1:8000)
const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// ----------------------------------------------------------------------------------------------------
// ADDED MOCK DATA
// ----------------------------------------------------------------------------------------------------
const HOUSTON_BUSINESSES_BY_ZIP = {
  "77005": {
    center: [-95.401, 29.718], // Coords for 77005 ZIP code center
  },
  "77002": {
    center: [-95.367, 29.761], // Coords for 77002 ZIP code center
  },
  "77027": {
    center: [-95.427, 29.740], // Coords for 77027 ZIP code center
  },
  "77063": {
    center: [-95.531, 29.754], // Coords for 77063 ZIP code center
  },
};

const HOUSTON_BUSINESS_LOCATIONS = [
  {
    id: "wu_1",
    text: "Western Union Agent",
    place_name: "4112 Bellaire Blvd, Houston, TX 77025",
    zip_code: "77025",
    geometry: { coordinates: [-95.421, 29.715] },
    competitor: { name: "Western Union", fee: 5.00, recipient_gets: 1050.00 },
    distance_km: 3.5,
  },
  {
    id: "mg_1",
    text: "MoneyGram at CVS",
    place_name: "2501 Rice Blvd, Houston, TX 77005",
    zip_code: "77005",
    geometry: { coordinates: [-95.405, 29.716] },
    competitor: { name: "MoneyGram", fee: 4.50, recipient_gets: 1055.00 },
    distance_km: 1.2,
  },
  {
    id: "ria_1",
    text: "Ria Money Transfer",
    place_name: "5225 Buffalo Speedway, Houston, TX 77005",
    zip_code: "77005",
    geometry: { coordinates: [-95.412, 29.710] },
    competitor: { name: "Ria", fee: 3.99, recipient_gets: 1060.00 },
    distance_km: 2.0,
  },
  {
    id: "wu_2",
    text: "Western Union at Kroger",
    place_name: "1931 S Shepherd Dr, Houston, TX 77019",
    zip_code: "77019",
    geometry: { coordinates: [-95.402, 29.755] },
    competitor: { name: "Western Union", fee: 5.00, recipient_gets: 1050.00 },
    distance_km: 4.1,
  },
  {
    id: "mg_2",
    text: "MoneyGram at Walmart",
    place_name: "2727 Dunvale Rd, Houston, TX 77063",
    zip_code: "77063",
    geometry: { coordinates: [-95.531, 29.754] },
    competitor: { name: "MoneyGram", fee: 4.50, recipient_gets: 1055.00 },
    distance_km: 13.0,
  },
  {
    id: "xoom_1",
    text: "Xoom",
    place_name: "3133 Edloe St, Houston, TX 77027",
    zip_code: "77027",
    geometry: { coordinates: [-95.414, 29.735] },
    competitor: { name: "Xoom", fee: 2.99, recipient_gets: 1062.00 },
    distance_km: 2.8,
  },
  {
    id: "wu_3",
    text: "Western Union Agent Downtown",
    place_name: "800 Lamar St, Houston, TX 77002",
    zip_code: "77002",
    geometry: { coordinates: [-95.364, 29.758] },
    competitor: { name: "Western Union", fee: 5.00, recipient_gets: 1050.00 },
    distance_km: 0.5,
  },
  {
    id: "mg_3",
    text: "MoneyGram at 7-Eleven",
    place_name: "1310 Prairie St, Houston, TX 77002",
    zip_code: "77002",
    geometry: { coordinates: [-95.359, 29.764] },
    competitor: { name: "MoneyGram", fee: 4.50, recipient_gets: 1055.00 },
    distance_km: 0.8,
  },
];
// ----------------------------------------------------------------------------------------------------

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
  const [searchedZipCoords, setSearchedZipCoords] = useState(null); // ADDED
  const markerRefs = useRef([]);
  const zipMarkerRef = useRef(null); // ADDED

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
    
    // Clear the old zip code marker and add the new one
    if (zipMarkerRef.current) zipMarkerRef.current.remove();
    if (searchedZipCoords) {
      const zipMarker = new mapboxgl.Marker({ color: '#007bff' })
        .setLngLat(searchedZipCoords)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>Your Searched Location</strong>"))
        .addTo(mapRef.current);
      zipMarkerRef.current = zipMarker;
    }

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
  }, [businesses, aiBestBrand, aiBestBizId, toCurrency, searchedZipCoords]); // ADDED searchedZipCoords

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
    setAiBestBrand("");
    setAiOptions([]);

    const mockData = HOUSTON_BUSINESS_LOCATIONS.filter(
      (biz) => biz.zip_code === zipCode
    );

    const zipCenter = HOUSTON_BUSINESSES_BY_ZIP[zipCode];
    if (zipCenter && mapRef.current) {
      const coordinates = zipCenter.center;
      setSearchedZipCoords(coordinates);
      mapRef.current.flyTo({ center: coordinates, zoom: 12 });

      if (mockData.length > 0) {
        setBusinesses(mockData);
        setZipMessage(`${mockData.length} location(s) found in ${zipCode}`);

        // Build canonical brand list for backend scoring using alias rules
        const storesForBackend = Array.from(new Set(
          (mockData || [])
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

        const annotated = mockData.map((biz) => {
          const label = `${biz.text || ''} ${biz.properties?.category || ''} ${biz.place_name || ''}`;
          const brandName = brandFromLabel(label); // Proper brand like 'Western Union'
          const match = brandName ? channels.find((c) => (c.name || '') === brandName) : null;
          return { ...biz, competitor: match || null, detectedBrand: brandName };
        });

        setBusinesses(annotated);

        // Fit map to show all found POIs, accounting for sidebars
        const bounds = new mapboxgl.LngLatBounds();
        [...annotated, { geometry: { coordinates: coordinates } }].forEach((biz) => {
          const coords = biz?.geometry?.coordinates || biz?.center;
          if (coords && coords.length >= 2) bounds.extend([coords[0], coords[1]]);
        });

        if (!bounds.isEmpty()) {
          const leftPad = isLocationSidebarOpen ? 420 : 20;
          const rightPad = isCurrencySidebarOpen ? 420 : 20;
          mapRef.current.fitBounds(bounds, {
            padding: { top: 40, bottom: 40, left: leftPad, right: rightPad },
            maxZoom: 15,
            duration: 800,
          });
        }

      } else {
        setZipMessage("No money transfer locations found in that ZIP code.");
        setBusinesses([]);
      }
    } else {
      setZipMessage("Could not find data for that ZIP code.");
      setSearchedZipCoords(null);
    }

    setZipLoading(false);
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
          ` (Market rate: ${data.market_rate}, Our rate: ${data.our_rate})\n` +
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
            <p className="framework-note">Markers: blue = your location, green = AI pick, dark blue = priced, gray = no data</p>
            {zipLoading && <p>Searching nearby locations…</p>}
            {zipMessage && <p>{zipMessage}</p>}
            {businesses.length > 0 ? (
              <ul>
                {businesses.map((biz, idx) => (
                  <li key={biz.id || idx}>
                    <strong>{biz.text}</strong>
                    <p>{biz.place_name || "Address not available"}</p>
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
              <p>No locations found. Try a new ZIP code from our mock data (77005, 77002, 77027, 77063).</p>
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
