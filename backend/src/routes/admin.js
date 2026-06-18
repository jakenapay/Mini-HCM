const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { computeHours } = require('../services/computeHours');

const { toZonedTime } = require('date-fns-tz');
const TIMEZONE = 'Asia/Manila';       

// All admin routes require authentication AND admin role
router.use(requireAuth, requireAdmin);

// GET /api/admin/employees - List all employee users
router.get('/employees', async (req, res) => {
  try {
    const snap = await db.collection('users').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/attendance?userId=xxx&date=yyyy-MM-dd - View an employee's punches
router.get('/attendance', async (req, res) => {
  try {
    const { userId, date } = req.query;
    let query = db.collection('attendance');

    if (userId) query = query.where('userId', '==', userId);
    if (date) query = query.where('date', '==', date);

    const snap = await query.orderBy('punchIn', 'desc').limit(100).get();
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/attendance/:id - Edit a punch record and recompute metrics
router.put('/attendance/:id', async (req, res) => {
  try {
    const { punchIn, punchOut } = req.body;
    const docRef = db.collection('attendance').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Record not found' });

    const punch = snap.data();
    const userSnap = await db.collection('users').doc(punch.userId).get();
    const schedule = userSnap.data()?.schedule || { start: '09:00', end: '18:00' };

    const updatedIn = punchIn || punch.punchIn;
    const updatedOut = punchOut || punch.punchOut;

    let metrics = {};
    if (updatedIn && updatedOut) {
      metrics = computeHours(updatedIn, updatedOut, schedule);
    }

    await docRef.update({ punchIn: updatedIn, punchOut: updatedOut, ...metrics });
    res.json({ id: req.params.id, punchIn: updatedIn, punchOut: updatedOut, ...metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/daily?date=yyyy-MM-dd - All employees' summary for a given day
router.get('/reports/daily', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required (yyyy-MM-dd)' });

    const snap = await db.collection('dailySummary').where('date', '==', date).get();
    const summaries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Enrich with user names
    const enriched = await Promise.all(
      summaries.map(async s => {
        const userSnap = await db.collection('users').doc(s.userId).get();
        return { ...s, userName: userSnap.data()?.name || s.userId };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/weekly?userId=xxx&weekStart=yyyy-MM-dd - 7-day rollup
router.get('/reports/weekly', async (req, res) => {
  try {
    const { userId, weekStart } = req.query;
    if (!userId || !weekStart) {
      return res.status(400).json({ error: 'userId and weekStart required' });
    }

    // Build list of 7 date strings
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const snap = await db.collection('dailySummary')
      .where('userId', '==', userId)
      .where('date', 'in', dates)
      .get();

    const days = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Totals across the week
    const totals = days.reduce(
      (acc, d) => ({
        regularHours: acc.regularHours + (d.regularHours || 0),
        overtimeHours: acc.overtimeHours + (d.overtimeHours || 0),
        nightDiffHours: acc.nightDiffHours + (d.nightDiffHours || 0),
        lateMinutes: acc.lateMinutes + (d.lateMinutes || 0),
        undertimeMinutes: acc.undertimeMinutes + (d.undertimeMinutes || 0),
      }),
      { regularHours: 0, overtimeHours: 0, nightDiffHours: 0, lateMinutes: 0, undertimeMinutes: 0 }
    );

    res.json({ days, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
