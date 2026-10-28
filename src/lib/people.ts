// Who a profile is. Besides the primary `email` and `name`, a marc_people profile can list
// `otherEmails` (old, personal or second addresses) and `otherNames` (the forms used in author
// lists, e.g. "Ratnayake, A."). Projects find their team by any of the emails; publications find
// their authors by any of the names. Matching ignores upper and lower case.
import { getCollection, type CollectionEntry } from "astro:content";

export type Person = CollectionEntry<"people">;
type Project = CollectionEntry<"projects">;

export const normEmail = (email: string) => email.trim().toLowerCase();

/** Past members (`status: past`) keep their profile, projects and papers, but are listed separately. */
export const isPast = (person: Person) => person.data.status === "past";

/** All of a person's addresses, normalised. */
export const personEmails = (person: Person) => [person.data.email, ...person.data.otherEmails].map(normEmail);

/**
 * Lower case, without a leading title, full stops as spaces, ", " after commas, single spaces:
 * "Prof. Roshan Godaliyadda" → "roshan godaliyadda", "Ratnayake,A." → "ratnayake, a".
 */
export const normName = (name: string) =>
    name
        .toLowerCase()
        .replace(/^\s*(prof|dr|mr|ms|mrs|eng|ir)\.?\s+/, "")
        .replace(/\./g, " ")
        .replace(/\s*,\s*/g, ", ")
        .replace(/\s+/g, " ")
        .replace(/[\s,]+$/, "")
        .trim();

/** Name forms used to find a person in author lists. Single words are skipped: too many false matches. */
export const personNames = (person: Person) =>
    [...new Set([person.data.name, ...person.data.otherNames].map(normName))].filter((n) => n.includes(" "));

/** True when `authors` contains one of the name forms as a whole name (not inside a longer word). */
export function authorsInclude(authors: string, names: string[]): boolean {
    const text = normName(authors);
    return names.some((name) => {
        for (let i = text.indexOf(name); i !== -1; i = text.indexOf(name, i + 1)) {
            const before = text[i - 1];
            const after = text[i + name.length];
            if ((!before || !/[a-z]/.test(before)) && (!after || !/[a-z]/.test(after))) return true;
        }
        return false;
    });
}

let emailIndex: Map<string, Person> | undefined;

/** Every address (primary and other) → its profile. */
export async function peopleByEmail(): Promise<Map<string, Person>> {
    if (emailIndex) return emailIndex;
    emailIndex = new Map();
    for (const person of await getCollection("people")) {
        for (const email of personEmails(person)) emailIndex.set(email, person);
    }
    return emailIndex;
}

export interface TeamEntry {
    person?: Person;
    label: string;
}

const warned = new Set<string>();

/**
 * A project's supervisors and researchers, resolved to profiles by any of their emails.
 * An email with no profile is left out (never printed, decision D12); a plain name is shown as
 * given; a person listed twice (e.g. under two of their addresses) appears once.
 */
export async function projectTeam(project: Project): Promise<{ supervisors: TeamEntry[]; members: TeamEntry[] }> {
    const byEmail = await peopleByEmail();
    const seen = new Set<string>();
    const resolve = (refs: string[]): TeamEntry[] =>
        refs.flatMap((ref) => {
            const person = byEmail.get(normEmail(ref));
            if (!person) {
                if (!ref.includes("@")) return [{ label: ref }];
                const key = `${project.id}|${ref}`;
                if (!warned.has(key)) {
                    warned.add(key);
                    console.warn(`[projects/${project.id}] team email "${ref}" does not match a people profile`);
                }
                return [];
            }
            if (seen.has(person.id)) return [];
            seen.add(person.id);
            return [{ person, label: person.data.name }];
        });
    return { supervisors: resolve(project.data.supervisors), members: resolve(project.data.projectMembers) };
}

/** Projects that list any of the person's emails as supervisor or researcher. */
export function isOnProject(person: Person, project: Project): boolean {
    const emails = new Set(personEmails(person));
    return [...project.data.supervisors, ...project.data.projectMembers].some((ref) => emails.has(normEmail(ref)));
}
