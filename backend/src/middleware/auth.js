const { auth } = require('../firebase');

// Verifies the Firebase ID token sent in the Authorization header.
// Attaches decoded user info to req.user for downstream route handlers.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Additional middleware: allows only users with role === 'admin' in Firestore.
// Must be used after requireAuth.
async function requireAdmin(req, res, next) {
  const { db } = require('../firebase');
  const snap = await db.collection('users').doc(req.user.uid).get();
  if (!snap.exists || snap.data().role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
