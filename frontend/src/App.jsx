import React, { useState, useEffect } from 'react';

function App() {
  // --- State ---
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState({});

  // Fetch all available currencies when the app first loads
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
  }, []); // The empty array [] means this runs only once

  // --- Main function to handle the conversion ---
  const handleConversion = async () => {
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setIsLoading(true);
    setResult(''); // Clear previous result

    try {
      // 1. Fetch the conversion rate from the API
      const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
      const data = await response.json();
      const convertedAmount = data.rates[toCurrency];

      // 2. Display the result
      const resultText = `${amount} ${fromCurrency} is equal to ${convertedAmount.toFixed(2)} ${toCurrency}`;
      setResult(resultText);

      // TODO: Add Gemini API call here to translate resultText if language is not English

    } catch (error) {
      console.error("Conversion failed:", error);
      setResult("Error: Could not perform conversion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Currency Translator</h1>
      <div className="converter-ui">
        {/* Amount Input - You can type any number here */}
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
            <select id="from-currency" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
              {Object.entries(currencies).map(([code, name]) => (
                <option key={code} value={code}>{code} - {name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="to-currency">To</label>
            <select id="to-currency" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
              {Object.entries(currencies).map(([code, name]) => (
                <option key={code} value={code}>{code} - {name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Language Selector */}
        <div className="input-group">
          <label htmlFor="language-select">Language</label>
          <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="Hindi">Hindi</option>
          </select>
        </div>

        {/* This is the button that triggers the conversion */}
        <button onClick={handleConversion} disabled={isLoading}>
          {isLoading ? 'Converting...' : 'Convert'}
        </button>
      </div>

      <div id="result-display">
        {result && <h2>{result}</h2>}
      </div>
    </div>
  );
}

export default App;
