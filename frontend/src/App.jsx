import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Read the Mapbox token from Vite env; may be undefined during development.
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

function App() {
  // State for our currency translator
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Map setup (deferred until user opens modal)
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const handleConversion = async () => {
    setIsLoading(true);
    console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency}...`);

    setTimeout(() => {
      setResult(`(Sample Result) ${amount} ${fromCurrency} is a lot of ${toCurrency}!`);
      setIsLoading(false);
    }, 1500);
  };

  // Initialize the map only when the modal is visible and the token exists.
  useEffect(() => {
    if (!showMapModal) return;
    // If there's no token, don't attempt to initialize Mapbox (we'll show a fallback).
    if (!mapboxgl.accessToken) {
      console.warn("Mapbox access token is not set. Showing fallback map.");
      return;
    }

    if (mapRef.current) return; // already initialized

    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-74.5, 40],
        zoom: 9,
      });

      new mapboxgl.Marker()
        .setLngLat([-74.5, 40])
        .setPopup(new mapboxgl.Popup().setHTML("<h3>Tax rate: 15%</h3>"))
        .addTo(mapRef.current);
    } catch (err) {
      console.error("Failed to initialize Mapbox map:", err);
    }

    // Cleanup when modal closes
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore remove errors
        }
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

        {/* Currency Selectors */}
        <div className="currency-selectors">
          <div className="input-group">
            <label htmlFor="from-currency">From</label>
            <select
              id="from-currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
            >
              <option value="USD">USD - United States Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="to-currency">To</label>
            <select
              id="to-currency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
            >
              <option value="INR">INR - Indian Rupee</option>
              <option value="MXN">MXN - Mexican Peso</option>
              <option value="CAD">CAD - Canadian Dollar</option>
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

      {/* Map controls - open modal */}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => setShowMapModal(true)}>Show Map</button>
      </div>

      {/* Modal for map - clicking backdrop or the close button will close it */}
      {showMapModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowMapModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()} // prevent backdrop close when clicking modal
          >
            <button
              className="modal-close"
              aria-label="Close map"
              onClick={() => setShowMapModal(false)}
            >
              ×
            </button>

            {/* If no Mapbox token, show a lightweight OpenStreetMap iframe as a fallback */}
            {mapboxgl.accessToken ? (
              <div
                ref={mapContainerRef}
                className="map-container"
                aria-label="Map container"
              />
            ) : (
              <div className="map-fallback">
                <iframe
                  title="Fallback OpenStreetMap"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-74.6%2C39.9%2C-74.4%2C40.1&layer=mapnik"
                  style={{ border: 0, width: "100%", height: "100%" }}
                />
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  Mapbox token not configured. Showing OpenStreetMap fallback.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
