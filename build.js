/* build.js
   Figma inlines ui.html into the plugin, so it cannot load separate files at
   runtime. This script stitches the source files into one dist/ui.html.

   Run:  node build.js

   Nothing to install. No npm, no bundler. */

const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const parts = {
  CSS:      read("src/ui.css"),
  TOKENS:   read("src/data/tokens.js"),
  PATTERNS: read("src/data/patterns.js"),
  JOURNEYS: read("src/data/journeys.js"),
  ICONS:    read("src/data/icons.js"),
  ENGINE:   read("src/engine.js"),
  CLAUDE:   read("src/claude.js"),
  UI:       read("src/ui.js")
};

let html = read("src/ui.template.html");
for (const [key, body] of Object.entries(parts)) {
  const token = `/*<<${key}>>*/`;
  if (!html.includes(token)) {
    console.error(`Template is missing ${token}`);
    process.exit(1);
  }
  html = html.replace(token, "\n" + body + "\n");
}

if (!fs.existsSync(path.join(root, "dist"))) fs.mkdirSync(path.join(root, "dist"));
fs.writeFileSync(path.join(root, "dist/ui.html"), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`Built dist/ui.html  (${kb} kB)`);
console.log("In Figma: Plugins > Development > Import plugin from manifest, then pick manifest.json");
