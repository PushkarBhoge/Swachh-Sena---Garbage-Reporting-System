const axios = require('axios');

// Cache rates for 1 hour to avoid hitting API on every request
let cachedRates = null;
let cacheTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const FALLBACK_RATES = { INR: 1, USD: 83, EUR: 90, GBP: 105, JPY: 0.55, AUD: 54, CAD: 61 };

async function getRates() {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) return FALLBACK_RATES;

  // Return cached rates if still fresh
  if (cachedRates && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    return cachedRates;
  }

  try {
    const res = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/INR`);
    const data = res.data;

    if (data.result !== 'success') return FALLBACK_RATES;

    // API returns rates relative to INR base, but as "how much X per 1 INR"
    // We need "how much INR per 1 X", so we invert
    const rawRates = data.conversion_rates;
    const rates = { INR: 1 };
    for (const [currency, rate] of Object.entries(rawRates)) {
      if (rate > 0) rates[currency] = 1 / rate;
    }

    cachedRates = rates;
    cacheTime = Date.now();
    return rates;
  } catch (err) {
    console.error('Exchange rate fetch failed, using fallback rates:', err.message);
    return cachedRates || FALLBACK_RATES;
  }
}

async function toINR(amount, currency) {
  const rates = await getRates();
  return amount * (rates[currency] || 1);
}

module.exports = { getRates, toINR };
