const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');

// GET /api/summary/daily?days=7 - Returns the logged-in user's daily summaries
router.get('/daily', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const snap = await db.collection('dailySummary')
      .where('userId', '==', req.user.uid)
      .orderBy('date', 'desc')
      .limit(days)
      .get();

    const summaries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
