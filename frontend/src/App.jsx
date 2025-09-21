import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token
mapboxgl.accessToken = "pk.eyJ1IjoiYXRtb3N5dngiLCJhIjoiY21mc25ucW51MDhsYTJtb21oY3libWRpZSJ9.Aw4sr3YSsuIMM_kDh0J5hg";

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
  const [optimizationResult, setOptimizationResult] = useState("");

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

    try {
      const geoResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipCode}.json?access_token=${mapboxgl.accessToken}&country=US&types=postcode`
      );
      const geoData = await geoResponse.json();

      if (geoData.features && geoData.features.length > 0) {
        const coordinates = geoData.features[0].center;
        mapRef.current.flyTo({ center: coordinates, zoom: 12 });

        const searchQuery = "Western Union;MoneyGram;Ria Money Transfer;Wise";
        const poiResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            searchQuery
          )}.json?access_token=${mapboxgl.accessToken}&proximity=${coordinates[0]},${coordinates[1]}&limit=10`
        );
        const poiData = await poiResponse.json();

        let nearbyBusinesses = poiData.features || [];

        const backendResponse = await fetch(
          `http://127.0.0.1:8000/api/rates/compare/${fromCurrency}/${toCurrency}?amount=${amount}`
        );
        const backendData = await backendResponse.json();

        nearbyBusinesses = nearbyBusinesses.map((biz) => {
          const competitor =
            backendData?.competitors?.find((c) =>
              biz.text.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
            ) || null;

          return {
            ...biz,
            competitor,
          };
        });

        setBusinesses(nearbyBusinesses);
      } else {
        alert("Could not find location for that ZIP code.");
      }
    } catch (error) {
      console.error("Geocoding or backend compare failed:", error);
    }
  };

  // AI Optimization
  const handleOptimize = async () => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      setOptimizationResult("Gemini API key is not configured.");
      return;
    }
    if (!amount) return;
    setIsLoading(true);
    setOptimizationResult("🤖 AI is thinking...");

    const mockCompetitorData = {
      "Western Union": { fee: 5.99, rate_markup_percent: 5 },
      "MoneyGram": { fee: 4.99, rate_markup_percent: 4 },
      Remitly: { fee: 2.99, rate_markup_percent: 3 },
      "Finance Connect (Our Service)": { fee: 2.0, rate_markup_percent: 1.5 },
    };

    const prompt = `A user wants to send ${amount} ${fromCurrency}. Based on this competitor data (fees and exchange rate markup percentages), which service is the best deal and why? Data: ${JSON.stringify(
      mockCompetitorData
    )}`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;
      setOptimizationResult(aiResponse);
    } catch (error) {
      console.error("Gemini API error:", error);
      setOptimizationResult("Could not get AI recommendation.");
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
            {businesses.length > 0 ? (
              <ul>
                {businesses.map((biz, idx) => (
                  <li key={biz.id || idx}>
                    <strong>{biz.text}</strong>
                    <p>{biz.properties?.address || "Address not available"}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
