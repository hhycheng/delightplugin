/* build.js — Figma inlines ui.html into the plugin, so it cannot load separate
   files at runtime. This stitches src/ into dist/ui.html.
   Run:  node build.js        No npm, no bundler. */
const fs = require("fs"), path = require("path");
const root = __dirname, read = p => fs.readFileSync(path.join(root, p), "utf8");
const parts = {
  CSS:      read("src/ui.css"),
  TOKENS:   read("src/data/tokens.js"),
  PATTERNS: read("src/data/patterns.js"),
  VERBS:    read("src/data/verbs.js"),
  STAGES:   read("src/data/stages.js"),
  FOUND:    read("src/data/found.js"),
  ICONS:    read("src/data/icons.js"),
  ENGINE:   read("src/engine.js"),
  CLAUDE:   read("src/claude.js"),
  UI:       read("src/ui.js")
};
let html = read("src/ui.template.html");
for (const [k, body] of Object.entries(parts)) {
  const token = `/*<<${k}>>*/`;
  if (!html.includes(token)) { console.error("Template missing " + token); process.exit(1); }
  html = html.replace(token, "\n" + body + "\n");
}
if (!fs.existsSync(path.join(root, "dist"))) fs.mkdirSync(path.join(root, "dist"));
fs.writeFileSync(path.join(root, "dist/ui.html"), html);
console.log(`Built dist/ui.html  (${(Buffer.byteLength(html)/1024).toFixed(1)} kB)`);
console.log("Figma: Plugins > Development > Import plugin from manifest, pick manifest.json");
