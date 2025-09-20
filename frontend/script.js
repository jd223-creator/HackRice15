// Get references to our NEW HTML elements
const amountInput = document.getElementById("amount-input");
const fromCurrencySelect = document.getElementById("from-currency");
const toCurrencySelect = document.getElementById("to-currency");
const convertBtn = document.getElementById("convert-btn");
const resultDisplay = document.getElementById("result-display");

// Listen for a click on the "Convert" button
convertBtn.addEventListener("click", () => {
  // 1. Get the values from the user inputs
  const amount = amountInput.value;
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;

  // 2. Check if the user entered an amount
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return; // Stop the function here
  }
  
  // 3. (Next Step) We will call the currency conversion API here!
  console.log(`Converting ${amount} from ${fromCurrency} to ${toCurrency}`);

  // 4. (Next Step) We will display the final result
  resultDisplay.innerHTML = "<h2>Calculating...</h2>";
});

// IMPROVEMENT:

// check the language of the website or see if the text can be automatically translated to someone's home language