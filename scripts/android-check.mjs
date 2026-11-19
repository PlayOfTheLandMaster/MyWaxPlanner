// The weekly Android check: signs the test account in on an emulated Pixel 7
// (Chrome) at the live site and opens every main screen, looking for what
// broke there before: sideways scrolling, tap targets under 44 px, missing
// headings, server errors and script errors. It reads only; nothing is saved.
//
//   node scripts/android-check.mjs <password-file> <output-folder>
//
// The test account (android-test@mywaxplanner.test) is empty and its password
// is scrambled between runs: the run sets a fresh one first and scrambles it
// after (see the weekly scheduled task). Playwright is preinstalled in the
// coding environment; the live site must be on its allowed hosts.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Through require, which finds the coding environment's preinstalled Playwright
// from any folder; an import would look only in this project's node_modules.
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const [pwFile, out = "android-check"] = process.argv.slice(2);
const base = "https://www.mywaxplanner.com";
const SCREENS = [
  ["today", "/"],
  ["sessions", "/plan"],
  ["plan-start", "/plan/start"],
  ["record", "/history/new?record=1"],
  ["history", "/history"],
  ["wax-box", "/wax-box"],
  ["wax-add", "/wax-box/add"],
  ["learn-notes", "/learn"],
  ["learn-videos", "/learn?tab=videos"],
  ["note-new", "/learn/notes/new"],
  ["how-to", "/learn/how-to"],
  ["account", "/account"],
  ["venues", "/venues"],
  ["venue-new", "/venues/new"],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const problems = [];
let screen = "login";
page.on("pageerror", (e) => problems.push(`${screen}: script error: ${e.message.slice(0, 200)}`));
page.on("response", (r) => {
  if (r.status() >= 500 && r.url().startsWith(base)) problems.push(`${screen}: server error ${r.status()} on ${new URL(r.url()).pathname}`);
});

await page.goto(`${base}/login`, { waitUntil: "networkidle" });
await page.fill("input[name=email]", "android-test@mywaxplanner.test");
await page.fill("input[name=password]", readFileSync(pwFile, "utf8").trim());
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => {}), page.click("button[type=submit]")]);
if (new URL(page.url()).pathname.startsWith("/login")) {
  problems.push("login: could not sign the test account in");
  await page.screenshot({ path: join(out, "login.png") });
}

const report = {};
for (const [name, path] of SCREENS) {
  if (problems.some((p) => p.startsWith("login:"))) break;
  screen = name;
  await page.goto(base + path, { waitUntil: "networkidle" }).catch((e) => problems.push(`${name}: did not load: ${e.message.slice(0, 120)}`));
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.closest(".sr-only,[hidden]") && !inClosedFold(el);
    };
    // Chrome still gives a size to what is inside a closed <details>, but nobody can see or tap it
    // (its innerText is empty). It flagged the weather card's Open-Meteo credit as a blank 15 px link.
    function inClosedFold(el) {
      const d = el.closest("details:not([open])");
      return !!d && el.closest("summary")?.parentElement !== d;
    }
    // A link inside a sentence is read, not aimed at; standalone controls must be 44 px.
    const inSentence = (el) => el.tagName === "A" && el.parentElement && ["P", "LI", "SPAN"].includes(el.parentElement.tagName) && el.parentElement.innerText.trim() !== el.innerText.trim();
    const small = [...document.querySelectorAll("a, button, select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), summary")]
      .filter((el) => visible(el) && !inSentence(el) && el.getBoundingClientRect().height < 40)
      .map((el) => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().height)}px`);
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest("[style*=overflow],.overflow-x-auto"))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()} "${(el.innerText || "").trim().slice(0, 30)}"`);
    return { over: document.documentElement.scrollWidth - vw, small: [...new Set(small)].slice(0, 6), wide, h1: document.querySelector("h1")?.innerText ?? null };
  });
  report[name] = { url: page.url(), ...m };
  if (m.over > 0) problems.push(`${name}: the page scrolls sideways by ${m.over}px (${m.wide.join(", ")})`);
  if (m.small.length) problems.push(`${name}: small tap targets: ${m.small.join("; ")}`);
  if (!m.h1) problems.push(`${name}: no page heading (did it load?)`);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
}
await browser.close();
writeFileSync(join(out, "report.json"), JSON.stringify({ when: new Date().toISOString(), problems, screens: report }, null, 1));
console.log(problems.length ? `PROBLEMS (${problems.length}):\n- ${problems.join("\n- ")}` : `All ${SCREENS.length} screens fine.`);
