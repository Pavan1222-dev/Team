import countryToCurrency from 'country-to-currency';
import { ProviderError, requestJson } from './http-client.js';

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v2/rate';
const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

export function getCurrencyForCountry(countryCode) {
  const code = countryToCurrency[String(countryCode).toUpperCase()];
  if (!code) throw new ProviderError('country-currency-map', `No currency mapping for country code ${countryCode}.`);
  return { code, name: currencyNames.of(code) ?? code };
}

function validateRateResponse(body, currencyCode) {
  if (!body || body.base_code !== currencyCode || body.quote_code !== 'INR'
    || !Number.isFinite(Number(body.rate)) || typeof body.date !== 'string') {
    throw new ProviderError('frankfurter', 'Provider returned an unexpected exchange-rate response.');
  }
  return { base: body.base_code, quote: body.quote_code, rate: Number(body.rate), date: body.date };
}

export function createCurrencyProvider(options = {}) {
  return {
    getCurrency: getCurrencyForCountry,

    async getRateToInr(currencyCode) {
      const code = String(currencyCode).toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) {
        throw new ProviderError('frankfurter', 'Currency code must use three letters.');
      }
      if (code === 'INR') return { base: 'INR', quote: 'INR', rate: 1, date: new Date().toISOString().slice(0, 10) };
      const url = `${FRANKFURTER_URL}/${encodeURIComponent(code)}/INR`;
      return requestJson('frankfurter', url, {
        ...options,
        validate: (body) => validateRateResponse(body, code),
      });
    },
  };
}
