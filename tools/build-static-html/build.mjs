#!/usr/bin/env node
// Builds ONE self-contained, offline-viewable HTML file bundling every requirements
// doc in the repo (index + all TDA4VM_*.md + Vulnerability_Analysis/*.md): Mermaid
// diagrams and images are inlined as base64 data URIs, so the output has zero
// external dependencies (no CDN, no separate image files) and can be emailed/shipped
// as a single artifact. Intended to be regenerated on every commit (see
// .github/workflows/build-static-html.yml).
//
// Usage: node build.mjs [output-path]
// Requires: npm install (in this folder) + tools/mermaid-render's mmdc/Chrome set up
// (for any live ```mermaid blocks still present in the source docs).

import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, "..", "..");
const MMDC = path.join(REPO_ROOT, "tools", "mermaid-render", "node_modules", ".bin", "mmdc");
const MERMAID_CONFIG = path.join(REPO_ROOT, "tools", "mermaid-render", "mermaid-config.json");
const PUPPETEER_CONFIG = path.join(REPO_ROOT, "tools", "mermaid-render", "puppeteer-config.json");
const TMP_DIR = path.join(TOOL_DIR, ".tmp");
const OUTPUT_PATH = path.resolve(REPO_ROOT, process.argv[2] || "dist/TDA4VM_Full_Requirements_Static.html");

// Order mirrors index.md's topic table, then the vulnerability-analysis pair.
const DOC_ORDER = [
  "index.md",
  "TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements.md",
  "TDA4VM_Secure_JTAG_Requirements.md",
  "TDA4VM_SecureAccess_Requirements.md",
  "TDA4VM_SecOC_Requirements.md",
  "TDA4VM_Secure_Logging_Requirements.md",
  "TDA4VM_OTA_FOTA_SOTA_Requirements.md",
  "TDA4VM_Secure_Reprogramming_Requirements.md",
  "TDA4VM_RTMD_Requirements.md",
  "TDA4VM_Secure_Storage_Requirements.md",
  "Vulnerability_Analysis/TDA4VM_Vulnerability_Analysis_Requirements.md",
  "Vulnerability_Analysis/SVS_ParkingAssist_Vulnerability_Analysis_Report.md",
];

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

function slugFor(relPath) {
  return path.basename(relPath, ".md");
}

function stripFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { title: null, body: text };
  const titleMatch = m[1].match(/^title:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;
  return { title, body: text.slice(m[0].length) };
}

function pngToDataUri(pngPath) {
  const buf = fs.readFileSync(pngPath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function htmlToDataUri(htmlPath) {
  const buf = fs.readFileSync(htmlPath);
  return `data:text/html;base64,${buf.toString("base64")}`;
}

let mermaidCounter = 0;
function renderMermaidToDataUri(source) {
  const base = `inline-${mermaidCounter++}`;
  const mmdPath = path.join(TMP_DIR, `${base}.mmd`);
  const pngPath = path.join(TMP_DIR, `${base}.png`);
  fs.writeFileSync(mmdPath, source);
  execFileSync(
    MMDC,
    ["-i", mmdPath, "-o", pngPath, "-b", "white", "-s", "3", "-c", MERMAID_CONFIG, "-p", PUPPETEER_CONFIG],
    { stdio: "inherit" }
  );
  return pngToDataUri(pngPath);
}

// Pre-compute data URIs for every already-rendered PNG under assets/diagrams so
// the "{{ '/assets/diagrams/X.png' | relative_url }}" tags can be swapped in place.
const diagramsDir = path.join(REPO_ROOT, "assets", "diagrams");
const diagramDataUris = new Map();
for (const f of fs.readdirSync(diagramsDir).filter((f) => f.endsWith(".png"))) {
  diagramDataUris.set(f, pngToDataUri(path.join(diagramsDir, f)));
}

function preprocessBody(body) {
  let out = body;

  // Liquid image tags -> inline base64 data URI.
  out = out.replace(
    /\{\{\s*['"]\/assets\/diagrams\/([^'"]+\.png)['"]\s*\|\s*relative_url\s*\}\}/g,
    (full, filename) => diagramDataUris.get(filename) || full
  );

  // Liquid link to the TARA ECU-selector landing page -> the embedded dashboard
  // section added further down in this same static document (see below).
  out = out.replace(
    /\{\{\s*['"]\/TARA\/Ref\/index\.html['"]\s*\|\s*relative_url\s*\}\}/g,
    "#tara-parking-dashboard"
  );

  // Liquid cross-doc links (index.md's topic table) -> in-page anchors.
  out = out.replace(
    /\{\{\s*['"]\/(?:Vulnerability_Analysis\/)?([^'"/]+)\.html['"]\s*\|\s*relative_url\s*\}\}/g,
    (full, basename) => `#${basename}`
  );

  // Collapsed <details> "mermaid-source" fences (kramdown markdown="1" is not
  // understood by markdown-it) -> plain <pre> so the fence markers don't show.
  out = out.replace(/```mermaid-source\n([\s\S]*?)```/g, (full, src) => `<pre>${src}</pre>`);

  // Live ```mermaid fences (graph LR / sequenceDiagram not yet pre-rendered) ->
  // rendered PNG inlined as base64, wrapped so it stays centered/scrollable.
  out = out.replace(/```mermaid\n([\s\S]*?)```/g, (full, src) => {
    const dataUri = renderMermaidToDataUri(src);
    return `<div class="mermaid-wrapper"><img src="${dataUri}" alt="diagram" style="max-width:100%;"></div>`;
  });

  return out;
}

const sections = [];
for (const relPath of DOC_ORDER) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { title, body } = stripFrontMatter(raw);
  const slug = slugFor(relPath);
  const processed = preprocessBody(body);
  const html = md.render(processed);
  sections.push({ slug, title: title || slug, html });
  console.log(`Rendered ${relPath} -> #${slug}`);
}

// TARA/Ref/*.html are interactive JS dashboards, not markdown - embed the Parking
// dashboard directly (as a self-contained base64 data-URI iframe) so the offline
// export carries the same interactive TARA content as the live site, not just a link.
const taraParkingPath = path.join(REPO_ROOT, "TARA", "Ref", "TARA_PARKING.html");
const taraParkingDataUri = htmlToDataUri(taraParkingPath);
sections.push({
  slug: "tara-parking-dashboard",
  title: "TARA Dashboards",
  html: `<p>The live site's <a href="https://vinodneelakantam.github.io/Sec_Concepts_Req_tracability/TARA/Ref/index.html">TARA ECU selector</a>
lets you pick an ECU (Parking or SDV) and view its interactive Threat Analysis and Risk Assessment
dashboard, plus a \u201cFull Report\u201d tab linking to the vulnerability analysis report included
elsewhere in this document. The SDV ECU option is still TBD.</p>
<p>The Parking ECU dashboard is embedded below, fully interactive (editable scores, risk/concept
filters, XLSX export) exactly as it appears on the live site:</p>
<iframe src="${taraParkingDataUri}" style="width:100%;height:1000px;border:1px solid #d0d7de;border-radius:6px;" title="TARA Parking Dashboard"></iframe>`,
});
console.log("Embedded TARA/Ref/TARA_PARKING.html -> #tara-parking-dashboard");

let commitSha = "unknown";
try {
  commitSha = (process.env.GITHUB_SHA || execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim()).slice(0, 12);
} catch {
  // git not available - leave as "unknown"
}
const buildDate = new Date().toISOString().slice(0, 10);

const tocItems = sections
  .map((s) => `<li><a href="#${s.slug}">${s.title}</a></li>`)
  .join("\n      ");

const sectionsHtml = sections
  .map((s) => `<section id="${s.slug}" class="doc">\n${s.html}\n</section>`)
  .join('\n<hr class="doc-sep">\n');

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TDA4VM ADAS ECU Cybersecurity Requirements - Full Offline Report</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 1300px;
    margin: 0 auto;
    padding: 1.5rem 2.5rem 4rem;
    line-height: 1.6;
  }
  header.report-header {
    border-bottom: 1px solid #d0d7de;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
  }
  header.report-header p { margin: 0.2rem 0; color: #57606a; font-size: 0.9rem; }
  nav.toc {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
  }
  nav.toc h2 { margin-top: 0; font-size: 1.05rem; }
  nav.toc ol { margin: 0; padding-left: 1.2rem; columns: 2; }
  nav.toc li { break-inside: avoid; margin-bottom: 0.3rem; }
  pre { background: #f6f8fa; padding: 0.9rem; overflow-x: auto; border-radius: 6px; }
  code { background: #f6f8fa; padding: 0.15rem 0.35rem; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.6rem; text-align: left; }
  th { background: #f6f8fa; }
  .mermaid-wrapper { overflow-x: auto; margin: 1rem 0; text-align: center; }
  hr.doc-sep { border: none; border-top: 3px double #d0d7de; margin: 3rem 0; }
  section.doc { scroll-margin-top: 1rem; }
  footer { margin-top: 3rem; font-size: 0.85rem; color: #57606a; }
  a.back-to-top { font-size: 0.8rem; }
</style>
</head>
<body>
<header class="report-header">
  <h1>TDA4VM ADAS ECU Cybersecurity Requirements - Full Offline Report</h1>
  <p>Built from commit <code>${commitSha}</code> on ${buildDate}. Fully self-contained: no
  internet connection or external files required to view (diagrams are embedded).</p>
</header>
<nav class="toc" id="top">
  <h2>Contents</h2>
  <ol>
      ${tocItems}
  </ol>
</nav>
<main>
${sectionsHtml}
</main>
<footer>
  Generated by <code>tools/build-static-html/build.mjs</code>. Source repository:
  <a href="https://github.com/vinodneelakantam/Sec_Concepts_Req_tracability">Sec_Concepts_Req_tracability</a>.
</footer>
</body>
</html>
`;

fs.writeFileSync(OUTPUT_PATH, page);
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log(`\nWrote ${OUTPUT_PATH} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
