/**
 * Formatting for money, percentages and dates.
 *
 * These deliberately don't use locale formatting such as 'en-ZA', because Node.js
 * (server) and the browser ship different locale data: the server printed
 * "R 165,00" while the browser printed "R 165.00", which breaks hydration.
 * Everything below produces exactly the same text on the server, in the browser and in emails.
 */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'ZAR';
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? 'en-ZA';
export const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? 'Africa/Johannesburg';

// ---- Money: R 1 234.50 ---------------------------------------------------
const CURRENCY_SYMBOL = 'R';
const DECIMAL_SEPARATOR = '.';     // change to ',' for R 1 234,50
const GROUP_SEPARATOR = '\u00A0';  // non-breaking space, so amounts never wrap

// 'en-US' digit formatting is identical everywhere; separators are swapped below.
const digits = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(n: number) {
  const value = Number(n) || 0;
  const [whole, cents] = digits.format(Math.abs(value)).split('.');
  return `${value < 0 ? '-' : ''}${CURRENCY_SYMBOL}\u00A0${whole.replace(/,/g, GROUP_SEPARATOR)}${DECIMAL_SEPARATOR}${cents}`;
}

// ---- Percent: 33.33 % ------------------------------------------------------
const pct = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, useGrouping: false });
export const formatPercent = (n: number) => `${pct.format(Number(n) || 0)} %`;

// ---- Dates: 7 Oct 2026, 14:05 (always in the store's time zone) ------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function parts(iso: string) {
  const p = Object.fromEntries(dateParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: p.year, m: MONTHS[Number(p.month) - 1], d: Number(p.day), h: p.hour, min: p.minute };
}

export function formatDate(iso: string) {
  const { y, m, d } = parts(iso);
  return `${d} ${m} ${y}`;
}

export function formatDateTime(iso: string) {
  const { y, m, d, h, min } = parts(iso);
  return `${d} ${m} ${y}, ${h}:${min}`;
}

/** Today's date in the store's time zone, as YYYY-MM-DD. */
export function todayISO() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

/** "2026-10-31" -> "31 Oct 2026" (a calendar date, no time zone shift). */
export function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export { ORDER_STATUS_LABEL } from '@/lib/order-status';
