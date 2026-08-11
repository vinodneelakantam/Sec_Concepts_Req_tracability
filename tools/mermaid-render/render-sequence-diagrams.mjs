#!/usr/bin/env node
// Pre-renders each TDA4VM_*.md "5.3" sequenceDiagram into a high-res PNG under
// assets/diagrams/, replacing the live mermaid fence with an <img> (for crisp
// GitHub Pages rendering/zoom) and keeping the mermaid source in a collapsed
// <details> block so it stays editable. Re-run this after editing any 5.3 diagram.
//
// Usage: node render-sequence-diagrams.mjs
// Requires: npm install (in this folder) + a Chrome/Chromium runnable by puppeteer.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, "..", "..");
const ASSETS_DIR = path.join(REPO_ROOT, "assets", "diagrams");
const TMP_DIR = path.join(TOOL_DIR, ".tmp");
const MMDC = path.join(TOOL_DIR, "node_modules", ".bin", "mmdc");
const MERMAID_CONFIG = path.join(TOOL_DIR, "mermaid-config.json");
const PUPPETEER_CONFIG = path.join(TOOL_DIR, "puppeteer-config.json");

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const files = fs.readdirSync(REPO_ROOT).filter((f) => /^TDA4VM_.*\.md$/.test(f));
const liveBlockRe = /```mermaid\n([\s\S]*?)```/g;
const sourceBlockRe = /```mermaid-source\n([\s\S]*?)```/;
const headingRe = /###\s*5\.3\s+(.+)/;

function renderPng(diagramSource, baseName, pngName) {
  const mmdPath = path.join(TMP_DIR, `${baseName}.mmd`);
  const pngPath = path.join(ASSETS_DIR, pngName);
  fs.writeFileSync(mmdPath, diagramSource);
  execFileSync(
    MMDC,
    ["-i", mmdPath, "-o", pngPath, "-b", "white", "-s", "3", "-c", MERMAID_CONFIG, "-p", PUPPETEER_CONFIG],
    { stdio: "inherit" }
  );
}

for (const file of files) {
  const fullPath = path.join(REPO_ROOT, file);
  const text = fs.readFileSync(fullPath, "utf8");
  const baseName = file.replace(/\.md$/, "");
  const pngName = `${baseName}-sequence.png`;

  // Already converted once: regenerate the PNG from the editable source block in place.
  const sourceMatch = text.match(sourceBlockRe);
  if (sourceMatch) {
    renderPng(sourceMatch[1], baseName, pngName);
    console.log(`REGEN ${file} -> assets/diagrams/${pngName}`);
    continue;
  }

  // First-time conversion: find the live sequenceDiagram fence and replace it.
  const headingMatch = text.match(headingRe);
  const caption = headingMatch ? headingMatch[1].trim() : "Sequence diagram";
  const blocks = [...text.matchAll(liveBlockRe)];
  const seqMatch = blocks.find((m) => m[1].trim().startsWith("sequenceDiagram"));
  if (!seqMatch) {
    console.log(`SKIP  ${file} (no sequenceDiagram block found)`);
    continue;
  }

  const diagramSource = seqMatch[1];
  renderPng(diagramSource, baseName, pngName);

  const replacement = `<p align="center">
  <a href="{{ '/assets/diagrams/${pngName}' | relative_url }}" target="_blank" rel="noopener">
    <img src="{{ '/assets/diagrams/${pngName}' | relative_url }}" alt="${caption}" style="max-width:100%;">
  </a>
</p>
<details markdown="1">
<summary>Mermaid source (for editing/regeneration)</summary>

\`\`\`mermaid-source
${diagramSource}\`\`\`

</details>
`;

  const updatedText = text.replace(seqMatch[0], replacement);
  fs.writeFileSync(fullPath, updatedText);
  console.log(`OK    ${file} -> assets/diagrams/${pngName}`);
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log("Done.");
