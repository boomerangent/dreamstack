#!/usr/bin/env node
// Stamp a new public address into every file that has it hard-coded, so a
// domain change is one command:   npm run site-url https://www.example.com
// Then rebuild (npm run build) and redeploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npm run site-url https://your-domain.com");
  process.exit(1);
}
let next;
try {
  next = new URL(arg.includes("://") ? arg : `https://${arg}`);
} catch {
  console.error("That doesn't look like a web address:", arg);
  process.exit(1);
}
const nextOrigin = next.origin;

const indexPath = path.join(root, "index.html");
const index = fs.readFileSync(indexPath, "utf8");
const m = index.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)\/?" \/>/);
if (!m) {
  console.error("Could not find the canonical link in index.html");
  process.exit(1);
}
const currentOrigin = m[1];
if (currentOrigin === nextOrigin) {
  console.log(`Already set to ${nextOrigin}.`);
}

for (const f of ["index.html", "public/robots.txt", "public/sitemap.xml"]) {
  const p = path.join(root, f);
  const s = fs.readFileSync(p, "utf8");
  const count = s.split(currentOrigin).length - 1;
  if (count) fs.writeFileSync(p, s.split(currentOrigin).join(nextOrigin));
  console.log(`${f}: ${count} address(es) updated`);
}

const envPath = path.join(root, ".env");
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
if (/^VITE_SITE_URL=.*$/m.test(env)) {
  env = env.replace(/^VITE_SITE_URL=.*$/m, `VITE_SITE_URL=${nextOrigin}`);
} else {
  env = env.replace(/\s*$/, "\n") + `VITE_SITE_URL=${nextOrigin}\n`;
}
fs.writeFileSync(envPath, env);
console.log(`.env: VITE_SITE_URL=${nextOrigin}`);
console.log(`\nDone: ${currentOrigin} -> ${nextOrigin}. Next: npm run build, then redeploy.`);
