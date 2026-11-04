// Screenshots each project's homepage into thumbs/ and records the path in projects.json.
//   npm run shoot        -> only projects without an image
//   npm run shoot:all    -> redo every project
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "projects.json");
const thumbDir = path.join(root, "thumbs");

export function slugFor(url) {
  const u = new URL(url);
  return (u.hostname.replace(/^www\./, "") + u.pathname)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function shoot({ all = false, only = null } = {}) {
  const projects = JSON.parse(await readFile(dataFile, "utf8"));
  const todo = projects.filter((p) => (only ? p.url === only : all || !p.image));
  if (todo.length === 0) {
    console.log("Nothing to screenshot.");
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright isn't installed. Run: npm install && npx playwright install chromium");
    process.exit(1);
  }

  await mkdir(thumbDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

  for (const p of todo) {
    process.stdout.write(`${p.url} ... `);
    try {
      let res;
      try {
        res = await page.goto(p.url, { waitUntil: "networkidle", timeout: 20000 });
      } catch {
        res = await page.goto(p.url, { waitUntil: "load", timeout: 30000 });
      }
      if (!res || res.status() >= 400) {
        throw new Error(`site answered ${res ? res.status() : "nothing"}, not saving an error page`);
      }
      await page.waitForTimeout(1000); // let fonts and intro animations settle
      const file = `thumbs/${slugFor(p.url)}.jpg`;
      await page.screenshot({ path: path.join(root, file), type: "jpeg", quality: 82 });
      p.image = file;
      console.log("saved", file);
    } catch (err) {
      console.log("failed:", err.message.split("\n")[0]);
    }
  }

  await browser.close();
  await writeFile(dataFile, JSON.stringify(projects, null, 2) + "\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await shoot({ all: process.argv.includes("--all") });
}
