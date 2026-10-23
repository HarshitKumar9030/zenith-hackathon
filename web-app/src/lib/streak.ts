const DAY = 86400000;
export function activityDay(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function streakSummary(days: string[], now = new Date()) {
  const today = activityDay(now);
  const unique = new Set(days);
  const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY;
  const current = dayNumber(today);
  let cursor = unique.has(today) ? current : current - 1;
  let streak = 0;
  while (unique.has(new Date(cursor * DAY).toISOString().slice(0, 10))) {
    streak++;
    cursor--;
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date((current - 6 + i) * DAY).toISOString().slice(0, 10);
    return { date, active: unique.has(date), today: date === today };
  });
  return { streak, todayActive: unique.has(today), week };
}
