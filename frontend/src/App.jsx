// src/App.jsx
import React, { useState } from 'react';

function App() {
  // State for our currency translator
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('INR');
  const [language, setLanguage] = useState('English');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConversion = async () => {
    // We will add the real API logic here later
    setIsLoading(true);
    console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency}...`);
    
    // Simulating a network request
    setTimeout(() => {
        setResult(`(Sample Result) ${amount} ${fromCurrency} is a lot of ${toCurrency}!`);
        setIsLoading(false);
    }, 1500);
  };

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
            <select id="from-currency" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
              <option value="USD">USD - United States Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="to-currency">To</label>
            <select id="to-currency" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
              <option value="INR">INR - Indian Rupee</option>
              <option value="MXN">MXN - Mexican Peso</option>
              <option value="CAD">CAD - Canadian Dollar</option>
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