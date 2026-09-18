import type { ISODate } from "./types";

/** Lokales Datum als "YYYY-MM-DD" (kein UTC-Shift). */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function today(now: Date = new Date()): ISODate {
  return toISODate(now);
}

/** Ostersonntag nach Gauß/Butcher. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function plusDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Gesetzliche Feiertage in NRW (Zielgruppe des Produkts). */
export function holidaysNRW(year: number): Set<ISODate> {
  const easter = easterSunday(year);
  const fixed: ISODate[] = [
    `${year}-01-01`, // Neujahr
    `${year}-05-01`, // Tag der Arbeit
    `${year}-10-03`, // Tag der Deutschen Einheit
    `${year}-11-01`, // Allerheiligen
    `${year}-12-25`,
    `${year}-12-26`,
  ];
  const moving = [
    plusDays(easter, -2), // Karfreitag
    plusDays(easter, 1), // Ostermontag
    plusDays(easter, 39), // Christi Himmelfahrt
    plusDays(easter, 50), // Pfingstmontag
    plusDays(easter, 60), // Fronleichnam
  ].map(toISODate);
  return new Set([...fixed, ...moving]);
}

export function isWorkday(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !holidaysNRW(date.getFullYear()).has(toISODate(date));
}

/**
 * Addiert Werktage (Mo–Fr ohne NRW-Feiertage).
 * Basis für das automatische Follow-up-Datum nach Angebotsversand.
 */
export function addWorkdays(start: Date, workdays: number): Date {
  let result = new Date(start);
  let left = Math.max(0, Math.floor(workdays));
  while (left > 0) {
    result = plusDays(result, 1);
    if (isWorkday(result)) left--;
  }
  return result;
}

/** Follow-up-Datum: N Werktage nach Versand (Default 3). */
export function followUpDateFrom(sentAt: Date, workdays = 3): ISODate {
  return toISODate(addWorkdays(sentAt, workdays));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** "seit 4 Tagen offen" */
export function daysOpen(sentAt: string, now: Date = new Date()): number {
  return Math.max(0, daysBetween(toISODate(new Date(sentAt)), toISODate(now)));
}

export function isDueToday(date: ISODate | undefined, now: Date = new Date()): boolean {
  if (!date) return false;
  return date <= toISODate(now);
}

export function formatDate(date: ISODate | undefined): string {
  if (!date) return "–";
  const d = fromISODate(date);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDays(n: number): string {
  if (n === 0) return "heute";
  if (n === 1) return "seit 1 Tag";
  return `seit ${n} Tagen`;
}
