const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { computeHours } = require('../services/computeHours');
const { format } = require('date-fns');
const { toZonedTime }  = require('date-fns-tz');

const TIMEZONE = 'Asia/Manila';

// GET /api/attendance/status - Is the user currently punched in?
router.get('/status', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('attendance')
      .where('userId', '==', req.user.uid)
      .where('punchOut', '==', null)
      .orderBy('punchIn', 'desc')
      .limit(1)
      .get();

    if (snap.empty) return res.json({ punchedIn: false, punch: null });

    const doc = snap.docs[0];
    res.json({ punchedIn: true, punch: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/punch-in
router.post('/punch-in', requireAuth, async (req, res) => {
  try {
    // Prevent double punch-in
    const existing = await db.collection('attendance')
      .where('userId', '==', req.user.uid)
      .where('punchOut', '==', null)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Already punched in. Please punch out first.' });
    }

    const nowUtc = new Date();
    const nowPHT = toZonedTime(nowUtc, TIMEZONE);
    const docRef = await db.collection('attendance').add({
      userId: req.user.uid,
      punchIn: nowUtc.toISOString(),
      punchOut: null,
      date: format(nowPHT, 'yyyy-MM-dd'),
    });

    res.json({ id: docRef.id, punchIn: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/punch-out
router.post('/punch-out', requireAuth, async (req, res) => {
  try {
    const snap = await db.collection('attendance')
      .where('userId', '==', req.user.uid)
      .where('punchOut', '==', null)
      .orderBy('punchIn', 'desc')
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(400).json({ error: 'No active punch-in found.' });
    }

    const doc = snap.docs[0];
    const punch = doc.data();
    const now = new Date().toISOString();

    // Get the user's schedule from Firestore
    const userSnap = await db.collection('users').doc(req.user.uid).get();
    const schedule = userSnap.data()?.schedule || { start: '09:00', end: '18:00' };

    // Compute all metrics
    const metrics = computeHours(punch.punchIn, now, schedule);

    await doc.ref.update({ punchOut: now, ...metrics });

    // Upsert the daily summary for this user+date
    await updateDailySummary(req.user.uid, punch.date, metrics);

    res.json({ id: doc.id, punchOut: now, ...metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/history?days=7 - User's own punch history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const snap = await db.collection('attendance')
      .where('userId', '==', req.user.uid)
      .orderBy('punchIn', 'desc')
      .limit(days * 3)
      .get();

    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregates metrics into the dailySummary collection.
// If a summary doc for that user+date already exists, it adds the new values.
async function updateDailySummary(userId, date, metrics) {
  const summaryRef = db.collection('dailySummary').doc(`${userId}_${date}`);
  const snap = await summaryRef.get();

  if (!snap.exists) {
    await summaryRef.set({
      userId,
      date,
      regularHours: metrics.regularHours,
      overtimeHours: metrics.overtimeHours,
      nightDiffHours: metrics.nightDiffHours,
      lateMinutes: metrics.lateMinutes,
      undertimeMinutes: metrics.undertimeMinutes,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const existing = snap.data();
    await summaryRef.update({
      regularHours: (existing.regularHours || 0) + metrics.regularHours,
      overtimeHours: (existing.overtimeHours || 0) + metrics.overtimeHours,
      nightDiffHours: (existing.nightDiffHours || 0) + metrics.nightDiffHours,
      lateMinutes: (existing.lateMinutes || 0) + metrics.lateMinutes,
      undertimeMinutes: (existing.undertimeMinutes || 0) + metrics.undertimeMinutes,
      updatedAt: new Date().toISOString(),
    });
  }
}

module.exports = router;
