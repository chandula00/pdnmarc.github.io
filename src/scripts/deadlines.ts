// Closes vacancies in the browser once their deadline passes (see src/lib/vacancies.ts).
// [data-closes] holds the closing moment in ms. Listed vacancies are removed; anything else
// gets [data-closed] so its CSS can switch to the "closed" wording.
const now = Date.now();

document.querySelectorAll<HTMLElement>("[data-closes]").forEach((el) => {
    if (now < Number(el.dataset.closes)) return;
    if (el.closest("[data-vacancy-list]")) el.remove();
    else el.setAttribute("data-closed", "");
});

document.querySelectorAll<HTMLElement>("[data-vacancy-list]").forEach((list) => {
    if (list.children.length) return;
    list.hidden = true;
    const empty = document.getElementById(list.dataset.vacancyList ?? "");
    if (empty) empty.hidden = false;
});
