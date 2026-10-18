import Link from "next/link";
import { addDays, readableDate } from "@/lib/dates";
export function DateNavigation({ date, today, path }: { date: string; today: string; path: "/today" | "/food" | "/training" }) {
  return <div className="date-bar"><Link className="icon-button" href={`${path}?date=${addDays(date, -1)}`} aria-label="Previous day">←</Link><div><strong>{readableDate(date)}</strong><span>{date === today ? "Today" : <Link href={path} className="text-link">Back to today</Link>}</span></div><Link className="icon-button" href={`${path}?date=${addDays(date, 1)}`} aria-label="Next day">→</Link></div>;
}
