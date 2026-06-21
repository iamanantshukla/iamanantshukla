// src/lib/gymDates.js — Monday-anchored week math for WeekStrip, Home and Gym.
export function localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();                 // 0=Sun..6=Sat
  const diff = wd === 0 ? -6 : 1 - wd;   // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}
export function weekDays(d) {
  const mon = mondayOf(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day;
  });
}
