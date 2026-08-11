---
name: requirements-doc-scaffolding
description: 'Scaffold a brand-new TDA4VM ADAS ECU cybersecurity requirements topic document (like TDA4VM_Secure_Storage_Requirements.md) end-to-end: pick a topic and unique ID suffix, fetch/verify grounding facts from TI TISCI docs, author all 4 structural views with full CSR/FCR/TCR/SWR/HWR requirement text, author and validate Mermaid diagrams, then update repo bookkeeping. Use when the user says things like "introduce a new security concept", "add a new requirements doc/topic", or "we need requirements for X" in this repo.'
---

# Requirements Doc Scaffolding (TDA4VM ADAS ECU)

Turns "add a new security topic" into the same repeatable procedure used for every existing
`TDA4VM_*_Requirements.md` file in this repo. Read
[the domain skill](../automotive-cybersecurity-requirements/SKILL.md) first — it holds the doc
structure convention, ID taxonomy, grounded chip facts, and Mermaid rules this procedure depends on.

## Procedure

1. **Scope the topic and pick an ID suffix.** Check the "Repo document set" table and the ID
   taxonomy line in the domain skill to avoid colliding with an existing suffix (`SA`, `JTAG`,
   `OTA`, `SRP`, `RTMD`, `LOG`, `COM`, `STO`, ...). Confirm the topic isn't already a subsection of
   an existing doc rather than a genuinely new concept.
2. **Research before writing.** Fetch the TI TISCI topic-guide pages relevant to the new topic
   (browse https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/index.html if unsure
   which page applies) and pull real message names, field names, and constraints. Never invent a
   plausible-sounding TISCI message or eFuse field — if a claim can't be grounded, say so and either
   fetch more docs or phrase the requirement generically instead of inventing a fake TI-specific detail.
3. **Create `TDA4VM_<Topic>_Requirements.md`** at the workspace root, following the exact 4-view
   structure from the domain skill:
   - `## 1. System Static Architecture` → `1.1` entities, `1.2` trust boundaries + `graph LR`
     mermaid, `1.3` full CSR/FCR/TCR requirement text (never bare ID ranges)
   - `## 2. Hardware Static Architecture` → `2.1` elements, `2.2` HWR mapping
   - `## 3. Software Static Architecture` → `3.1` blocks + `graph LR` mermaid, `3.2` SWR mapping
   - `## 4. Dynamic / Behavioral Views` → `4.1` `sequenceDiagram` with explicit `alt`/`opt` failure
     branches, `4.2` behavioral bullets each citing at least one CSR/FCR/TCR/SWR/HWR ID
4. **Write Section 1.3 in full sentences** under bold `**CSR**`/`**FCR**`/`**TCR**` subheadings —
   collapsing to `CSR-XXX-1 to CSR-XXX-5` fails review (see requirements-review skill).
5. **Author diagrams following the Mermaid authoring rules** in the domain skill (no semicolons in
   message text, no reserved words as aliases, no embedded arrows in message text, `graph LR` not
   `flowchart LR`, every `alt`/`opt`/`loop` closed).
6. **Validate every diagram with the real parser** — do not trust `get_errors` for Mermaid syntax.
   Use the portable Node.js + `mermaid@10`/`jsdom@21` procedure documented in the domain skill's
   "Validating Mermaid diagrams for real" section. Run it against the whole workspace, not just the
   new file, to confirm nothing regressed.
7. **Update repo bookkeeping** once the new doc is validated:
   - Add a row to the domain skill's "Repo document set" table and bump the topic-document count.
   - Add the new ID suffix to the taxonomy example line.
   - Add any new TI reference links used to the "Reference documentation" section.
   - If new grounded facts were learned (new TISCI messages, eFuse fields, hardware behavior), add
     a dedicated facts subsection so future docs can reuse them without re-fetching.
   - Update `/memories/repo/overview.md`'s doc count.
8. **Report back** a short summary: file created, new ID suffix, count of CSR/FCR/TCR/SWR/HWR
   requirements added, and confirmation that Mermaid validation passed with 0 failures.

## Common mistakes to avoid
- Skipping the TI-doc fetch step and writing generic textbook security boilerplate instead of a
  TDA4VM/TISCI-grounded claim.
- Forgetting `2.2`/`3.2` requirement IDs (`HWR-*`/`SWR-*`) — every doc has both, not just CSR/FCR/TCR.
- Adding the diagram without running the real Mermaid parser — `get_errors` will not catch syntax
  errors like semicolons inside message text or reserved-word aliases.
