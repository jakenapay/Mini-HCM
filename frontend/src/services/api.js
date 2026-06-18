import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Attaches the Firebase ID token to every request automatically.
async function request(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Attendance
  getPunchStatus: () => request('/api/attendance/status'),
  punchIn: () => request('/api/attendance/punch-in', { method: 'POST' }),
  punchOut: () => request('/api/attendance/punch-out', { method: 'POST' }),
  getHistory: (days = 7) => request(`/api/attendance/history?days=${days}`),

  // Summary
  getDailySummary: (days = 7) => request(`/api/summary/daily?days=${days}`),

  // Admin
  getEmployees: () => request('/api/admin/employees'),
  getAdminAttendance: (userId, date) => {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (date) params.set('date', date);
    return request(`/api/admin/attendance?${params}`);
  },
  editPunch: (id, data) => request(`/api/admin/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getDailyReport: (date) => request(`/api/admin/reports/daily?date=${date}`),
  getWeeklyReport: (userId, weekStart) =>
    request(`/api/admin/reports/weekly?userId=${userId}&weekStart=${weekStart}`),
};
