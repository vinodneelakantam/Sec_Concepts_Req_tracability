# build-static-html

Builds **one self-contained HTML file** bundling every requirements doc in the repo
(`index.md`, `Parking/index.md` + all `Parking/TDA4VM_*.md` + `Parking/Vulnerability_Analysis/*.md`,
and `SDV/index.md`) - no internet connection, CDN, or separate asset files needed to view it.
All Mermaid diagrams and images are inlined as base64 data URIs directly in the HTML.

This is the "ship to the outside world" artifact: a single file you can email, attach to
a release, or open straight from disk.

## Setup (one-time)

```sh
cd tools/mermaid-render && npm install   # provides mmdc + Chrome for any live diagrams
cd ../build-static-html && npm install
```

## Build

```sh
cd tools/build-static-html
node build.mjs                 # writes ../../dist/TDA4VM_Full_Requirements_Static.html
node build.mjs some/other.html # optional custom output path
```

Re-run this after editing any doc's content or diagrams. It always reflects whatever is
currently checked out (embeds the current commit SHA and build date in the footer).

## Automation

`.github/workflows/build-static-html.yml` runs this build on every push to `main` that
touches a doc/diagram/tool file, then:

- uploads the file as a workflow artifact, and
- publishes it as a GitHub Release asset under both a moving `latest-build` tag and a
  permanent `build-<short-sha>` tag per commit, so there's always a stable public URL
  to download the export from - no repo checkout or build step required by consumers.
