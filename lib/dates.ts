/**
 * Date helpers for SpendMeter. Timezone: Asia/Dubai (per Technical Design).
 */
const DUBAI = "Asia/Dubai";

export function getCurrentMonthLabel(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: DUBAI,
  }).format(now);
}

export function getCurrentDateInDubai(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DUBAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day"))
  );
}

/** Last day of month (1–31) for given year and month (month 1–12). */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
