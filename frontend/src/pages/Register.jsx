import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

const TIMEZONES = [
  'Asia/Manila',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    timezone: 'Asia/Manila',
    scheduleStart: '09:00',
    scheduleEnd: '18:00',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create the Firebase Auth account
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // 2. Save extended profile in Firestore (Auth only stores email/password)
      await setDoc(doc(db, 'users', user.uid), {
        name: form.name,
        email: form.email,
        role: 'employee',   // default role; admin must be set manually in Firestore
        timezone: form.timezone,
        schedule: {
          start: form.scheduleStart,
          end: form.scheduleEnd,
        },
        createdAt: new Date().toISOString(),
      });

      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Mini HCM</h1>
        <h2 className="auth-subtitle">Create Account</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="Juan dela Cruz" required />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
          </div>

          <div className="field">
            <label>Timezone</label>
            <select value={form.timezone} onChange={set('timezone')}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Shift Start</label>
              <input type="time" value={form.scheduleStart} onChange={set('scheduleStart')} required />
            </div>
            <div className="field">
              <label>Shift End</label>
              <input type="time" value={form.scheduleEnd} onChange={set('scheduleEnd')} required />
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
