import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { format, startOfWeek } from 'date-fns';

// ── Punch edit modal ────────────────────────────────────────────────────────
function EditModal({ punch, onClose, onSave }) {
  const [punchIn, setPunchIn] = useState(punch.punchIn?.slice(0, 16) || '');
  const [punchOut, setPunchOut] = useState(punch.punchOut?.slice(0, 16) || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(punch.id, {
        punchIn: punchIn ? new Date(punchIn).toISOString() : undefined,
        punchOut: punchOut ? new Date(punchOut).toISOString() : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Punch Record</h3>
        <div className="field">
          <label>Punch In</label>
          <input type="datetime-local" value={punchIn} onChange={e => setPunchIn(e.target.value)} />
        </div>
        <div className="field">
          <label>Punch Out</label>
          <input type="datetime-local" value={punchOut} onChange={e => setPunchOut(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Recompute'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ─────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState('punches'); // 'punches' | 'daily' | 'weekly'
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weekStart, setWeekStart] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );

  const [punches, setPunches] = useState([]);
  const [dailyReport, setDailyReport] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [editingPunch, setEditingPunch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(console.error);
  }, []);

  async function loadPunches() {
    setLoading(true);
    setMsg('');
    try {
      const data = await api.getAdminAttendance(selectedUserId || undefined, date || undefined);
      setPunches(data);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDailyReport() {
    setLoading(true);
    setMsg('');
    try {
      const data = await api.getDailyReport(date);
      setDailyReport(data);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeeklyReport() {
    if (!selectedUserId) return setMsg('Please select an employee.');
    setLoading(true);
    setMsg('');
    try {
      const data = await api.getWeeklyReport(selectedUserId, weekStart);
      setWeeklyReport(data);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSave(id, data) {
    await api.editPunch(id, data);
    setMsg('Punch updated and metrics recomputed.');
    loadPunches();
  }

  const employeeName = (uid) => employees.find(e => e.id === uid)?.name || uid;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admin Panel</h2>
      </div>

      {/* Tab switcher */}
      <div className="tab-bar">
        {['punches', 'daily', 'weekly'].map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'tab-active' : ''}`}
            onClick={() => { setTab(t); setMsg(''); }}
          >
            {t === 'punches' ? 'View/Edit Punches' : t === 'daily' ? 'Daily Report' : 'Weekly Report'}
          </button>
        ))}
      </div>

      {msg && <p className="error" style={{ marginBottom: '1rem' }}>{msg}</p>}

      {/* ── PUNCHES TAB ─────────────────────────────────────────────────── */}
      {tab === 'punches' && (
        <div className="card">
          <div className="filter-row">
            <div className="field">
              <label>Employee</label>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={loadPunches} disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Regular (h)</th>
                  <th>OT (h)</th>
                  <th>ND (h)</th>
                  <th>Late (min)</th>
                  <th>Undertime (min)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {punches.length === 0 && (
                  <tr><td colSpan={10} className="empty">No punches found.</td></tr>
                )}
                {punches.map(p => (
                  <tr key={p.id}>
                    <td>{employeeName(p.userId)}</td>
                    <td>{p.date}</td>
                    <td>{p.punchIn ? format(new Date(p.punchIn), 'HH:mm:ss') : '—'}</td>
                    <td>{p.punchOut ? format(new Date(p.punchOut), 'HH:mm:ss') : <span className="badge-active">Active</span>}</td>
                    <td>{p.regularHours?.toFixed(2) ?? '—'}</td>
                    <td>{p.overtimeHours?.toFixed(2) ?? '—'}</td>
                    <td>{p.nightDiffHours?.toFixed(2) ?? '—'}</td>
                    <td>{p.lateMinutes ?? '—'}</td>
                    <td>{p.undertimeMinutes ?? '—'}</td>
                    <td>
                      <button className="btn-edit" onClick={() => setEditingPunch(p)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DAILY REPORT TAB ────────────────────────────────────────────── */}
      {tab === 'daily' && (
        <div className="card">
          <div className="filter-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={loadDailyReport} disabled={loading}>
              {loading ? 'Loading...' : 'Load Report'}
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Regular (h)</th>
                  <th>OT (h)</th>
                  <th>Night Diff (h)</th>
                  <th>Late (min)</th>
                  <th>Undertime (min)</th>
                </tr>
              </thead>
              <tbody>
                {dailyReport.length === 0 && (
                  <tr><td colSpan={6} className="empty">No data for this date.</td></tr>
                )}
                {dailyReport.map(r => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.regularHours?.toFixed(2)}</td>
                    <td>{r.overtimeHours?.toFixed(2)}</td>
                    <td>{r.nightDiffHours?.toFixed(2)}</td>
                    <td>{r.lateMinutes}</td>
                    <td>{r.undertimeMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── WEEKLY REPORT TAB ───────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <div className="card">
          <div className="filter-row">
            <div className="field">
              <label>Employee</label>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Week Starting (Monday)</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={loadWeeklyReport} disabled={loading}>
              {loading ? 'Loading...' : 'Load Report'}
            </button>
          </div>

          {weeklyReport && (
            <>
              {/* Weekly totals KPIs */}
              <div className="kpi-row" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card" style={{ borderTopColor: '#2563eb' }}>
                  <p className="kpi-label">Total Regular</p>
                  <p className="kpi-value" style={{ color: '#2563eb' }}>{weeklyReport.totals.regularHours.toFixed(2)}<span className="kpi-unit">h</span></p>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#d97706' }}>
                  <p className="kpi-label">Total OT</p>
                  <p className="kpi-value" style={{ color: '#d97706' }}>{weeklyReport.totals.overtimeHours.toFixed(2)}<span className="kpi-unit">h</span></p>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#7c3aed' }}>
                  <p className="kpi-label">Total ND</p>
                  <p className="kpi-value" style={{ color: '#7c3aed' }}>{weeklyReport.totals.nightDiffHours.toFixed(2)}<span className="kpi-unit">h</span></p>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#dc2626' }}>
                  <p className="kpi-label">Total Late</p>
                  <p className="kpi-value" style={{ color: '#dc2626' }}>{weeklyReport.totals.lateMinutes}<span className="kpi-unit">min</span></p>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#b45309' }}>
                  <p className="kpi-label">Total Undertime</p>
                  <p className="kpi-value" style={{ color: '#b45309' }}>{weeklyReport.totals.undertimeMinutes}<span className="kpi-unit">min</span></p>
                </div>
              </div>

              {/* Day-by-day breakdown */}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Regular (h)</th>
                      <th>OT (h)</th>
                      <th>ND (h)</th>
                      <th>Late (min)</th>
                      <th>Undertime (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyReport.days.map(d => (
                      <tr key={d.id}>
                        <td>{d.date}</td>
                        <td>{d.regularHours?.toFixed(2)}</td>
                        <td>{d.overtimeHours?.toFixed(2)}</td>
                        <td>{d.nightDiffHours?.toFixed(2)}</td>
                        <td>{d.lateMinutes}</td>
                        <td>{d.undertimeMinutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {editingPunch && (
        <EditModal
          punch={editingPunch}
          onClose={() => setEditingPunch(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
