const express = require('express');
const { isValidUrl, generateShortCode } = require('./utils');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.post('/shorten', async (req, res) => {
    const { url, alias, expiry_date } = req.body;
    
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid or blocked URL' });
    }

    const shortCode = alias || generateShortCode();

    try {
      await db.run(
        `INSERT INTO urls (long_url, short_code, expiry_date) VALUES (?, ?, ?)`,
        [url, shortCode, expiry_date || null]
      );
      res.status(201).json({ short_code: shortCode });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Alias already in use' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/:code', async (req, res) => {
    const { code } = req.params;
    const row = await db.get(`SELECT long_url, expiry_date FROM urls WHERE short_code = ?`, [code]);

    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (row.expiry_date && new Date(row.expiry_date) < new Date()) {
      return res.status(404).json({ error: 'Link expired' });
    }

    const clickTime = new Date().toISOString();
    const referrer = req.get('Referrer') || null;
    const userAgent = req.get('User-Agent') || null;

    await db.run(
      `INSERT INTO clicks (short_code, click_time, referrer, user_agent) VALUES (?, ?, ?, ?)`,
      [code, clickTime, referrer, userAgent]
    );

    res.redirect(302, row.long_url);
  });

  app.get('/stats/:code', async (req, res) => {
    const { code } = req.params;
    
    const totalResult = await db.get(`SELECT COUNT(*) as total FROM clicks WHERE short_code = ?`, [code]);
    
    const recentClicks = await db.all(`
      SELECT date(click_time) as date, COUNT(*) as count 
      FROM clicks 
      WHERE short_code = ? AND click_time >= date('now', '-7 days')
      GROUP BY date(click_time)
    `, [code]);

    const referrers = await db.all(`
      SELECT referrer, COUNT(*) as count 
      FROM clicks 
      WHERE short_code = ? AND referrer IS NOT NULL
      GROUP BY referrer 
      ORDER BY count DESC 
      LIMIT 5
    `, [code]);

    res.json({
      total_clicks: totalResult.total,
      clicks_per_day: recentClicks,
      top_referrers: referrers
    });
  });

  return app;
}

module.exports = { createApp };
