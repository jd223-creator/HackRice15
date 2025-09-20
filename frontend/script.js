// --- Keep all the code from Part 1 above this line ---

// NEW: Add the reference to our new language dropdown
const languageSelect = document.getElementById("language-select");

// NEW: Your secret API Key for Google Gemini
const GEMINI_API_KEY = "PASTE_YOUR_API_KEY_HERE"; // IMPORTANT: Replace with your actual key

// NEW: This function calls the Gemini API to translate text
async function getTranslation(text, targetLanguage) {
  // If the target is English, no need to call the API
  if (targetLanguage === "English") {
    return text;
  }
  
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: `Translate the following financial text to ${targetLanguage}: "${text}"`
      }]
    }]
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    // Navigate through the response object to get the translated text
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Translation Error:", error);
    return "Translation failed."; // Return a fallback message
  }
}

// MODIFIED: We're updating the handleConversion function
async function handleConversion() {
  const amount = amountInput.value;
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;
  const targetLanguage = languageSelect.value; // Get the selected language

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  resultDisplay.innerHTML = `<h2>Converting and Translating...</h2>`;

  try {
    // Currency Conversion (same as before)
    const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
    const data = await response.json();
    const convertedAmount = data.rates[toCurrency];

    // Create the English result string
    const englishResult = `${amount} ${fromCurrency} is equal to ${convertedAmount.toFixed(2)} ${toCurrency}`;

    // Get the translation
    const translatedResult = await getTranslation(englishResult, targetLanguage);
    
    // Display the final, possibly translated, result
    resultDisplay.innerHTML = `<h2>${translatedResult}</h2>`;

  } catch (error) {
    resultDisplay.innerHTML = "<h2>Could not get conversion rate. Please try again.</h2>";
    console.error("Fetch Error:", error);
  }
}

// The event listener stays the same
convertBtn.addEventListener("click", handleConversion);