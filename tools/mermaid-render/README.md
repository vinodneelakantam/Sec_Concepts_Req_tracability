# mermaid-render

Pre-renders each `TDA4VM_*.md` section 5.3 `sequenceDiagram` into a high-res PNG under
`../../assets/diagrams/`, so GitHub Pages shows a crisp, zoomable static image instead of a
JS-rendered SVG squeezed into the page column. The mermaid source stays in the doc inside a
collapsed `<details>` block (fenced as `` ```mermaid-source ``, not `` ```mermaid ``, so the
site's client-side script doesn't try to render it again).

## Setup (one-time)

```sh
cd tools/mermaid-render
npm install
```

`npm install` pulls in `@mermaid-js/mermaid-cli` (puppeteer + a bundled Chrome). If Chrome fails
to launch with a missing shared library error (e.g. `libnss3.so`), install it system-wide:

```sh
sudo apt-get install -y libnss3 libnspr4
```

## Regenerate diagrams

```sh
cd tools/mermaid-render
node render-sequence-diagrams.mjs
```

- First run on a doc: converts its live `sequenceDiagram` fence into an `<img>` + collapsed source.
- Later runs: if you edited the source inside the `<details>` block, re-renders that doc's PNG in
  place (the markdown wrapper is left untouched).
