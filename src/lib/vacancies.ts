// Vacancies and opportunities (/vacancies). A vacancy is an ordinary marc_news article with
// `vacancy: true` in its front matter. It stays listed until the end of its `deadline` day in
// Sri Lanka time (UTC+05:30); one without a deadline stays listed until the flag is removed.
// Because the site is static, src/scripts/deadlines.ts repeats the check in the browser so a
// vacancy closes on time even when the site has not been rebuilt since.
import { getCollection, type CollectionEntry } from "astro:content";

export type NewsItem = CollectionEntry<"news">;

const DAY = 24 * 60 * 60 * 1000;
const SL_OFFSET = 5.5 * 60 * 60 * 1000;

/** Moment applications close (ms since epoch): midnight at the end of the deadline day, Sri Lanka time. */
export function closesAt(deadline: Date): number {
    // `deadline` is parsed from YYYY-MM-DD as UTC midnight of that day.
    return deadline.getTime() + DAY - SL_OFFSET;
}

export function isOpen(item: NewsItem, now = Date.now()): boolean {
    return !item.data.deadline || now < closesAt(item.data.deadline);
}

export const formatDeadline = (d: Date) =>
    d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Vacancies still open at build time: soonest deadline first, rolling ones (no deadline) last, newest first. */
export async function getOpenVacancies(): Promise<NewsItem[]> {
    const items = await getCollection("news", (n) => n.data.vacancy && isOpen(n));
    return items.sort((a, b) => {
        const da = a.data.deadline?.getTime() ?? Infinity;
        const db = b.data.deadline?.getTime() ?? Infinity;
        return da - db || b.data.date.getTime() - a.data.date.getTime();
    });
}
