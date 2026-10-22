import express from 'express';
import { getCityData, getCompareData } from './services/city-service.js';

const app = express();
app.disable('x-powered-by');

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/city/:name', async (req, res) => {
  const name = req.params.name.trim();
  if (!name) return res.status(400).json({ error: 'City name is required.' });

  try {
    const result = await getCityData(name, req.query.refresh === 'true');
    res.set('X-Cache', result.cache);
    return res.json(result.body);
  } catch (error) {
    console.error(JSON.stringify({ type: 'request_error', route: 'city', message: error.message }));
    return res.status(500).json({ error: 'Unable to build the city response.' });
  }
});

app.get('/compare', async (req, res) => {
  const names = typeof req.query.cities === 'string'
    ? [...new Set(req.query.cities.split(',').map((name) => name.trim()).filter(Boolean))]
    : [];

  if (names.length < 2 || names.length > 10) {
    return res.status(400).json({ error: 'Provide between 2 and 10 comma-separated cities in the cities query parameter.' });
  }

  try {
    const result = await getCompareData(names, req.query.refresh === 'true');
    res.set('X-Cache', result.cache);
    return res.json(result.body);
  } catch (error) {
    console.error(JSON.stringify({ type: 'request_error', route: 'compare', message: error.message }));
    return res.status(500).json({ error: 'Unable to build the comparison response.' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

export default app;
