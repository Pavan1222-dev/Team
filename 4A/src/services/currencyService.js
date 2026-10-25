
const { apiRequest } = require("../utils/apiClient");

const EXCHANGE_URL = "https://api.frankfurter.dev/v2/rate";

const COUNTRY_CURRENCIES = {
  India: { code: "INR", name: "Indian rupee" },
  Canada: { code: "CAD", name: "Canadian dollar" },
  "United States": { code: "USD", name: "United States dollar" },
  "United Kingdom": { code: "GBP", name: "British pound" },
  Australia: { code: "AUD", name: "Australian dollar" },
  Japan: { code: "JPY", name: "Japanese yen" },
  Singapore: { code: "SGD", name: "Singapore dollar" },
  Germany: { code: "EUR", name: "Euro" },
};

async function getCurrency(countryName) {
  const countryKey = Object.keys(COUNTRY_CURRENCIES).find(
    (name) => name.toLowerCase() === countryName.trim().toLowerCase()
  );

  if (!countryKey) {
    throw new Error(
      `Currency mapping not available for ${countryName}`
    );
  }

  const currency = COUNTRY_CURRENCIES[countryKey];
  const currencyCode = currency.code;

  if (currencyCode === "INR") {
    return {
      currencyCode,
      currencyName: currency.name,
      targetCurrency: "INR",
      exchangeRate: 1,
    };
  }

  const exchange = await apiRequest(
    `${EXCHANGE_URL}/${currencyCode.toLowerCase()}/inr`
  );

  if (typeof exchange.rate !== "number") {
    throw new Error(
      `Exchange rate unavailable for ${currencyCode}`
    );
  }

  return {
    currencyCode,
    currencyName: currency.name,
    targetCurrency: "INR",
    exchangeRate: exchange.rate,
    date: exchange.date,
  };
}

module.exports = { getCurrency };
