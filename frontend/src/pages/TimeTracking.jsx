import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';

export default function TimeTracking() {
  const { profile } = useAuth();
  const [status, setStatus] = useState(null);   // { punchedIn, punch }
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load punch status and today's history on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([api.getPunchStatus(), api.getHistory(7)]);
      setStatus(s);
      setHistory(h);
    } catch (err) {
      setMessage('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePunchIn() {
    setActionLoading(true);
    setMessage('');
    try {
      await api.punchIn();
      setMessage('Punched in successfully!');
      await loadData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePunchOut() {
    setActionLoading(true);
    setMessage('');
    try {
      const result = await api.punchOut();
      setMessage(
        `Punched out! Regular: ${result.regularHours?.toFixed(2)}h | OT: ${result.overtimeHours?.toFixed(2)}h | ND: ${result.nightDiffHours?.toFixed(2)}h`
      );
      await loadData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  const punchedIn = status?.punchedIn;
  const activePunch = status?.punch;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Time Tracking</h2>
        <p className="clock">{format(now, 'EEEE, MMMM d yyyy — HH:mm:ss')}</p>
      </div>

      {/* Shift info */}
      {profile?.schedule && (
        <div className="info-bar">
          Scheduled shift: <strong>{profile.schedule.start}</strong> – <strong>{profile.schedule.end}</strong>
          &nbsp;|&nbsp; Timezone: <strong>{profile.timezone}</strong>
        </div>
      )}

      {/* Punch card */}
      <div className="punch-card">
        <div className={`punch-status ${punchedIn ? 'status-in' : 'status-out'}`}>
          {punchedIn ? 'Currently Punched In' : 'Not Punched In'}
        </div>

        {punchedIn && activePunch && (
          <p className="punch-since">
            Since: {format(new Date(activePunch.punchIn), 'HH:mm:ss')}
          </p>
        )}

        <div className="punch-buttons">
          <button
            className="btn-punch btn-in"
            onClick={handlePunchIn}
            disabled={punchedIn || actionLoading}
          >
            Punch In
          </button>
          <button
            className="btn-punch btn-out"
            onClick={handlePunchOut}
            disabled={!punchedIn || actionLoading}
          >
            Punch Out
          </button>
        </div>

        {message && <p className={`punch-message ${message.includes('Failed') || message.includes('already') ? 'error' : 'success'}`}>{message}</p>}
      </div>

      {/* Punch history table */}
      <div className="card">
        <h3>Recent Punches (7 days)</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Regular (h)</th>
                <th>OT (h)</th>
                <th>ND (h)</th>
                <th>Late (min)</th>
                <th>Undertime (min)</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={8} className="empty">No records yet.</td></tr>
              )}
              {history.map(rec => (
                <tr key={rec.id}>
                  <td>{rec.date}</td>
                  <td>{rec.punchIn ? format(new Date(rec.punchIn), 'HH:mm:ss') : '—'}</td>
                  <td>{rec.punchOut ? format(new Date(rec.punchOut), 'HH:mm:ss') : <span className="badge-active">Active</span>}</td>
                  <td>{rec.regularHours?.toFixed(2) ?? '—'}</td>
                  <td>{rec.overtimeHours?.toFixed(2) ?? '—'}</td>
                  <td>{rec.nightDiffHours?.toFixed(2) ?? '—'}</td>
                  <td>{rec.lateMinutes ?? '—'}</td>
                  <td>{rec.undertimeMinutes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
