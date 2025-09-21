import React, { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Read the Mapbox token from Vite env
//mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";
mapboxgl.accessToken = "pk.eyJ1IjoiYXRtb3N5dngiLCJhIjoiY21mc25ucW51MDhsYTJtb21oY3libWRpZSJ9.Aw4sr3YSsuIMM_kDh0J5hg";


function App() {
  // --- State ---
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("INR");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState({});
  const [zipCode, setZipCode] = useState("");
  
  // NEW: State to control the sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Map setup ---
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  // useEffect to fetch currencies (same as before)
  useEffect(() => {
    fetch('https://api.frankfurter.app/currencies')
      .then(res => res.json())
      .then(data => setCurrencies(data));
  }, []);

  // useEffect to initialize the map
  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.warn("Mapbox access token is not set.");
      return;
    }
    if (mapRef.current) return; // already initialized
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-95.36, 29.76], // Houston coordinates
      zoom: 10,
    });
  }, []); // Runs once on load

  const handleConversion = async () => {
    // ... same conversion logic as before
    if (!amount) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
      const data = await res.json();
      const converted = data.rates[toCurrency];
      setResult(`${amount} ${fromCurrency} = ${converted.toFixed(2)} ${toCurrency}`);
    } catch (error) {
      setResult("Conversion failed.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleZipSearch = async () => {
    if (!zipCode) return;
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${zipCode}.json?access_token=${mapboxgl.accessToken}`
    );
     const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      
      // Move map to that ZIP
      mapRef.current.flyTo({ center: [lng, lat], zoom: 12 });

      // Add a marker
      new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>ZIP: ${zipCode}</h3>`))
        .addTo(mapRef.current);
    } else {
      alert("ZIP code not found");
    }
  } catch (error) {
    console.error("Error fetching ZIP geocode:", error);
  }
};

  return (
    <div>
      {/* Map container is now the main background */}
      <div ref={mapContainerRef} className="map-container" />
      
      {/* This button will live on the side to toggle the menu */}
      <button 
        className={`sidebar-toggle-btn ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? '‹' : '›'}
      </button>

      {/* The sidebar itself */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="converter-ui">
            <h1>Currency Translator</h1>
            
            {/* Amount Input */}
            <div className="input-group">
              <label>ZIP Code</label>
              <input 
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter ZIP"
                />
                <button onClick={handleZipSearch}>Go</button>
              </div>
            <div className="input-group">
                <label>Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            {/* Currency Selectors */}
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
