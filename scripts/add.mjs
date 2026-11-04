// npm run add  -> asks for a site's details, adds it to the top of projects.json, screenshots it.
import { createInterface } from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { shoot } from "./shoot.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "projects.json");

const rl = createInterface({ input: process.stdin, output: process.stdout });

let url = (await rl.question("URL: ")).trim();
if (!url) { console.log("A URL is needed."); process.exit(1); }
if (!/^https?:\/\//.test(url)) url = `https://${url}`;
try { new URL(url); } catch { console.log("That isn't a valid URL."); process.exit(1); }

const host = new URL(url).hostname.replace(/^www\./, "");
const year = new Date().getFullYear();

const title = (await rl.question(`Name (${host}): `)).trim() || host;
const yearIn = (await rl.question(`Year (${year}): `)).trim();
const description = (await rl.question("Description: ")).trim();
rl.close();

const projects = JSON.parse(await readFile(dataFile, "utf8"));
const existing = projects.findIndex((p) => p.url === url);
const entry = { title, url, year: Number(yearIn) || year, description };

if (existing >= 0) projects[existing] = { ...projects[existing], ...entry, image: undefined };
else projects.unshift(entry);

await writeFile(dataFile, JSON.stringify(projects, null, 2) + "\n");
console.log(existing >= 0 ? "Updated." : "Added.");

await shoot({ only: url });
