const { parseISO, differenceInMinutes, setHours, setMinutes, setSeconds, startOfDay, addDays } = require('date-fns');
const TIMEZONE = 'Asia/Manila';
const { toZonedTime } = require('date-fns-tz');

const {
  startOfDay, setHours, setMinutes, setSeconds,
  differenceInMinutes, addDays
} = require('date-fns');

/**
 * Computes all HCM metrics for a single punch pair.
 *
 * @param {string} punchIn  - ISO timestamp of punch-in
 * @param {string} punchOut - ISO timestamp of punch-out
 * @param {{ start: string, end: string }} schedule - e.g. { start: '09:00', end: '18:00' }
 * @returns {{ regularHours, overtimeHours, nightDiffHours, lateMinutes, undertimeMinutes }}
 */
function computeHours(punchIn, punchOut, schedule) {
  // Convert UTC timestamps to PHT before any computation
  const inTime  = toZonedTime(new Date(punchIn),  TIMEZONE);
  const outTime = toZonedTime(new Date(punchOut), TIMEZONE);

  const [schedStartH, schedStartM] = schedule.start.split(':').map(Number);
  const [schedEndH, schedEndM] = schedule.end.split(':').map(Number);

  // Anchor schedule to the punch-in calendar date
  const dayBase = startOfDay(inTime);
  const schedStart = setSeconds(setMinutes(setHours(dayBase, schedStartH), schedStartM), 0);
  let schedEnd = setSeconds(setMinutes(setHours(dayBase, schedEndH), schedEndM), 0);

  // Handle overnight shifts (e.g. 22:00 - 06:00)
  if (schedEnd <= schedStart) schedEnd = addDays(schedEnd, 1);

  // ── Late ─────────────────────────────────────────────────────────────────
  // How many minutes after scheduled start did the employee punch in?
  const lateMinutes = Math.max(0, differenceInMinutes(inTime, schedStart));

  // ── Undertime ────────────────────────────────────────────────────────────
  // How many minutes before scheduled end did the employee punch out?
  const undertimeMinutes = Math.max(0, differenceInMinutes(schedEnd, outTime));

  // ── Regular hours ────────────────────────────────────────────────────────
  // Time worked within the scheduled window
  const regularStart = inTime > schedStart ? inTime : schedStart;
  const regularEnd = outTime < schedEnd ? outTime : schedEnd;
  const regularMinutes = Math.max(0, differenceInMinutes(regularEnd, regularStart));

  // ── Overtime ─────────────────────────────────────────────────────────────
  // Time worked beyond the scheduled end
  const overtimeMinutes = outTime > schedEnd ? differenceInMinutes(outTime, schedEnd) : 0;

  // ── Night Differential ───────────────────────────────────────────────────
  // Any minute worked between 22:00 and 06:00 (next day)
  const nightDiffMinutes = computeNightDiff(inTime, outTime);

  return {
    regularHours: +(regularMinutes / 60).toFixed(4),
    overtimeHours: +(overtimeMinutes / 60).toFixed(4),
    nightDiffHours: +(nightDiffMinutes / 60).toFixed(4),
    lateMinutes,
    undertimeMinutes,
  };
}

/**
 * Calculates how many minutes between [start, end] fall in the 22:00–06:00 window.
 * We scan in 1-minute steps — straightforward and handles midnight crossings.
 */
function computeNightDiff(start, end) {
  let count = 0;
  const current = new Date(start);

  while (current < end) {
    const h = current.getHours();
    if (h >= 22 || h < 6) count++;
    current.setMinutes(current.getMinutes() + 1);
  }

  return count;
}

module.exports = { computeHours };
