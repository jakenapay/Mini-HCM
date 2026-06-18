import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

function KpiCard({ label, value, unit, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={{ color }}>{value}<span className="kpi-unit">{unit}</span></p>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDailySummary(7)
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Aggregate totals across all loaded days for the KPI row
  const totals = summaries.reduce(
    (acc, s) => ({
      regularHours: acc.regularHours + (s.regularHours || 0),
      overtimeHours: acc.overtimeHours + (s.overtimeHours || 0),
      nightDiffHours: acc.nightDiffHours + (s.nightDiffHours || 0),
      lateMinutes: acc.lateMinutes + (s.lateMinutes || 0),
      undertimeMinutes: acc.undertimeMinutes + (s.undertimeMinutes || 0),
    }),
    { regularHours: 0, overtimeHours: 0, nightDiffHours: 0, lateMinutes: 0, undertimeMinutes: 0 }
  );

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome, <strong>{profile?.name}</strong> &mdash; 7-day summary</p>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <KpiCard label="Regular Hours" value={totals.regularHours.toFixed(2)} unit="h" color="#2563eb" />
        <KpiCard label="Overtime" value={totals.overtimeHours.toFixed(2)} unit="h" color="#d97706" />
        <KpiCard label="Night Diff" value={totals.nightDiffHours.toFixed(2)} unit="h" color="#7c3aed" />
        <KpiCard label="Late" value={totals.lateMinutes} unit="min" color="#dc2626" />
        <KpiCard label="Undertime" value={totals.undertimeMinutes} unit="min" color="#b45309" />
      </div>

      {/* Daily breakdown table */}
      <div className="card">
        <h3>Daily Breakdown</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Regular (h)</th>
                <th>Overtime (h)</th>
                <th>Night Diff (h)</th>
                <th>Late (min)</th>
                <th>Undertime (min)</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <tr><td colSpan={6} className="empty">No data yet. Start by punching in!</td></tr>
              )}
              {summaries.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.regularHours?.toFixed(2)}</td>
                  <td className={s.overtimeHours > 0 ? 'highlight-ot' : ''}>{s.overtimeHours?.toFixed(2)}</td>
                  <td className={s.nightDiffHours > 0 ? 'highlight-nd' : ''}>{s.nightDiffHours?.toFixed(2)}</td>
                  <td className={s.lateMinutes > 0 ? 'highlight-late' : ''}>{s.lateMinutes}</td>
                  <td className={s.undertimeMinutes > 0 ? 'highlight-ut' : ''}>{s.undertimeMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
