const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SECOND_MS = 1000;

const DUE_YEAR = 2026;
export const DUE_DATE_ISO = new Date(Date.UTC(DUE_YEAR, 6, 1, 0, 0, 0)).toISOString();

export const PREGNANCY_TOTAL_WEEKS = 40;
const PREGNANCY_TOTAL_DAYS = PREGNANCY_TOTAL_WEEKS * 7;

export function computeCountdown(now, due) {
  const diff = due - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, arrived: true };
  }
  const days = Math.floor(diff / DAY_MS);
  const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((diff % MINUTE_MS) / SECOND_MS);
  return { days, hours, minutes, seconds, totalMs: diff, arrived: false };
}

function pad(n, width = 2) {
  return String(n).padStart(width, "0");
}

export function pregnancyWeek(now, due) {
  const daysRemaining = Math.max(0, Math.ceil((due - now) / DAY_MS));
  const daysCompleted = PREGNANCY_TOTAL_DAYS - daysRemaining;
  const week = Math.floor(daysCompleted / 7);
  return Math.max(0, Math.min(PREGNANCY_TOTAL_WEEKS, week));
}

export function formatCountdown({ days, hours, minutes, seconds }) {
  const dayWidth = String(days).length > 2 ? String(days).length : 2;
  return `${pad(days, dayWidth)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}
