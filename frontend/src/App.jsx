import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Read the Mapbox token from Vite env
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

function App() {
  // --- State ---
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState({});
  const [zipCode, setZipCode] = useState("77005");

  // NEW: Separate state for each sidebar
  const [isLocationSidebarOpen, setIsLocationSidebarOpen] = useState(true);
  const [isCurrencySidebarOpen, setIsCurrencySidebarOpen] = useState(false);

  // --- Map setup ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetch('https://api.frankfurter.app/currencies')
      .then(res => res.json())
      .then(data => setCurrencies(data));
  }, []);

  useEffect(() => {
    if (!mapboxgl.accessToken || !mapContainerRef.current) return;
    if (mapRef.current) return;
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-95.39, 29.71], // Center near Rice University
      zoom: 12,
    });
  }, []);

  const handleConversion = async () => {
    // ... same conversion logic ...
  };

  const handleZipCodeSearch = async (e) => {
    // ... same ZIP code search logic ...
  };

  // NEW: Placeholder data for businesses
  const businessFramework = [
    { id: 1, name: "MoneyGram at CVS", address: "123 Main St" },
    { id: 2, name: "Western Union at Walgreens", address: "456 University Blvd" },
    { id: 3, name: "Local Transfer Service", address: "789 Kirby Dr" },
  ];

  return (
    <div>
      {/* Map container is the main background */}
      <div ref={mapContainerRef} className="map-container" />
      
      {/* --- SIDEBARS AND TOGGLES --- */}

      {/* 1. Location Finder Sidebar and Toggle */}
      <button 
        className="sidebar-toggle-btn left" 
        onClick={() => setIsLocationSidebarOpen(!isLocationSidebarOpen)}
      >
        {isLocationSidebarOpen ? '‹' : '›'}
      </button>

      <div className={`sidebar left-sidebar ${isLocationSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
            <h1>Location Finder</h1>
            <form onSubmit={handleZipCodeSearch} className="input-group">
                <label>Search Houston ZIP Code</label>
                <div className="zip-search-wrapper">
                    <input 
                        type="text" 
                        value={zipCode} 
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="e.g., 77005"
                    />
                    <button type="submit">Go</button>
                </div>
            </form>

            <hr className="divider" />
            
            {/* NEW: Framework for businesses */}
            <div className="business-list">
                <h3>Money Transfer Locations</h3>
                <ul>
                    {businessFramework.map(biz => (
                        <li key={biz.id}>
                            <strong>{biz.name}</strong>
                            <p>{biz.address}</p>
                        </li>
                    ))}
                </ul>
                <p className="framework-note">
                    (Framework to show real businesses from the back-end later)
                </p>
            </div>
        </div>
      </div>

      {/* 2. Currency Converter Sidebar and Toggle */}
      <button 
        className="sidebar-toggle-btn right" 
        onClick={() => setIsCurrencySidebarOpen(!isCurrencySidebarOpen)}
      >
        $
      </button>
      
      <div className={`sidebar right-sidebar ${isCurrencySidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
            <h1>Currency Converter</h1>
            <div className="input-group">
                <label>Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="currency-selectors">
                <div className="input-group">
                    <label>From</label>
                    <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
                        {Object.entries(currencies).map(([code, name]) => (
                            <option key={code} value={code}>{code} - {name}</option>
                        ))}
                    </select>
                </div>
                <div className="input-group">
                    <label>To</label>
                    <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                        {Object.entries(currencies).map(([code, name]) => (
                            <option key={code} value={code}>{code} - {name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <button onClick={handleConversion} disabled={isLoading}>
                {isLoading ? "Converting..." : "Convert"}
            </button>
            <div className="result-display">
                {result && <h2>{result}</h2>}
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
