import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Read the Mapbox token from Vite env; may be undefined during development.
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

function App() {
  // --- State ---
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW: State to hold the list of all currencies
  const [currencies, setCurrencies] = useState({});

  // --- Map setup ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // NEW: useEffect to fetch all currencies when the app loads
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('https://api.frankfurter.app/currencies');
        const data = await response.json();
        setCurrencies(data);
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
      }
    };
    
    fetchCurrencies();
  }, []); // The empty array [] means this effect runs only once

  // FIXED: handleConversion now uses the real API
  const handleConversion = async () => {
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setIsLoading(true);
    setResult(''); // Clear previous result

    try {
      // Fetch the conversion rate from the Frankfurter API
      const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
      const data = await response.json();
      const convertedAmount = data.rates[toCurrency];

      // Display the result
      const resultText = `${amount} ${fromCurrency} is equal to ${convertedAmount.toFixed(2)} ${toCurrency}`;
      setResult(resultText);
      // TODO: Add Gemini API call here to translate resultText

    } catch (error) {
      console.error("Conversion failed:", error);
      setResult("Error: Could not perform conversion.");
    } finally {
      setIsLoading(false);
    }
  };

  // ... (keep the useEffect for the map as it is) ...
  useEffect(() => {
    if (!showMapModal || !mapboxgl.accessToken) return;
    if (mapRef.current) return;
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-74.5, 40],
        zoom: 9,
      });
    } catch (err) {
      console.error("Failed to initialize Mapbox map:", err);
    }
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [showMapModal]);


  return (
    <div className="container">
      <h1>Currency Translator</h1>
      <div className="converter-ui">
        {/* Amount Input */}
        <div className="input-group">
          <label htmlFor="amount-input">Amount</label>
          <input
            type="number"
            id="amount-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Currency Selectors - NOW DYNAMIC */}
        <div className="currency-selectors">
          <div className="input-group">
            <label htmlFor="from-currency">From</label>
            <select
              id="from-currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
            >
              {Object.entries(currencies).map(([code, name]) => (
                <option key={code} value={code}>{code} - {name}</option>
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
                <option key={code} value={code}>{code} - {name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Language Selector */}
        <div className="input-group">
          <label htmlFor="language-select">Language</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="Hindi">Hindi</option>
          </select>
        </div>

        {/* Convert Button */}
        <button onClick={handleConversion} disabled={isLoading}>
          {isLoading ? "Converting..." : "Convert"}
        </button>
      </div>

      <div id="result-display">{result && <h2>{result}</h2>}</div>

      {/* ... (keep the map modal JSX as it is) ... */}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => setShowMapModal(true)}>Show Map</button>
      </div>
      {showMapModal && (
        <div className="modal-backdrop" onClick={() => setShowMapModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowMapModal(false)}>×</button>
            {mapboxgl.accessToken ? (
              <div ref={mapContainerRef} className="map-container" />
            ) : (
              <div className="map-fallback">
                <iframe
                  title="Fallback OpenStreetMap"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-74.6%2C39.9%2C-74.4%2C40.1&layer=mapnik"
                  style={{ border: 0, width: "100%", height: "100%" }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;