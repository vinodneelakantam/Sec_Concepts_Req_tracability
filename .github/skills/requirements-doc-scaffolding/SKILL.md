---
name: requirements-doc-scaffolding
description: 'Scaffold a brand-new TDA4VM ADAS ECU cybersecurity requirements topic document (like TDA4VM_Secure_Storage_Requirements.md) end-to-end: pick a topic and unique ID suffix, fetch/verify grounding facts from TI TISCI docs, author all 6 structural sections with full CSG/FSC/FSR/SYSR/TSC/TSR/SWR/HWR/HSI requirement text, author and validate Mermaid diagrams, then update repo bookkeeping. Use when the user says things like "introduce a new security concept", "add a new requirements doc/topic", or "we need requirements for X" in this repo.'
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
3. **Create `Parking/TDA4VM_<Topic>_Requirements.md`** (Parking ECU docs live under `Parking/`;
   see the domain skill's "Site structure" note), following the exact 6-section
   structure from the domain skill (the flow: FSC(→FSR) → System Requirements + System Static
   Architecture → TSC(→TSR) → Hardware Requirements + Hardware Static Architecture → Software
   Requirements + Software Static & Dynamic Architecture → HSI):
   - `## 1. Functional Security Concept` → `1.1` CSG, `1.2` FSC, `1.3` FSR full requirement text
     (never bare ID ranges)
   - `## 2. System Requirements and System Static Architecture` → `2.1` entities, `2.2` trust
     boundaries + `graph LR` mermaid, `2.3` SYSR requirements (new content, not renamed from an
     older taxonomy)
   - `## 3. Technical Security Concept` → `3.1` TSC, `3.2` TSR full requirement text
   - `## 4. Hardware Requirements and Hardware Static Architecture` → `4.1` elements + `graph LR`
     hardware static architecture mermaid diagram, `4.2` HWR mapping
   - `## 5. Software Requirements and Software Static & Dynamic Architecture` → `5.1` blocks +
     `graph LR` mermaid, `5.2` SWR mapping, `5.3` `sequenceDiagram` with explicit `alt`/`opt` failure
     branches, `5.4` behavioral bullets each citing at least one CSG/FSC/FSR/SYSR/TSC/TSR/SWR/HWR ID
   - `## 6. Hardware-Software Interface (HSI)` → `6.1` HSI elements (registers/APIs/messages at the
     HW/SW boundary), `6.2` HSI requirements (new content)
4. **Write Sections 1.1-1.3, 2.3, 3.1-3.2, 4.2, 5.2, 6.2 in full sentences** under their own
   subheadings — collapsing to `CSG-XXX-1 to CSG-XXX-5` fails review (see requirements-review
   skill). SYSR (2.3) and HSI (6.2) are new categories per this taxonomy, not aliases of an older
   one — ground them in that doc's own Section 2 entities/boundaries and Section 4/5 hardware and
   software blocks respectively.
5. **Author diagrams following the Mermaid authoring rules** in the domain skill (no semicolons in
   message text, no reserved words as aliases, no embedded arrows in message text, `graph LR` not
   `flowchart LR`, every `alt`/`opt`/`loop` closed).
6. **Validate every diagram with the real parser** — do not trust `get_errors` for Mermaid syntax.
   Use the portable Node.js + `mermaid@10`/`jsdom@21` procedure documented in the domain skill's
   "Validating Mermaid diagrams for real" section. Run it against the whole workspace, not just the
   new file, to confirm nothing regressed.
7. **Update repo bookkeeping** once the new doc is validated:
   - Add a row to the domain skill's "Repo document set" table and bump the topic-document count.
   - Add a row to `Parking/index.md`'s topics table and to `README.md`'s topics table (both use
     `Parking/<file>.md` paths).
   - Add the new ID suffix to the taxonomy example line.
   - Add any new TI reference links used to the "Reference documentation" section.
   - If new grounded facts were learned (new TISCI messages, eFuse fields, hardware behavior), add
     a dedicated facts subsection so future docs can reuse them without re-fetching.
   - Update `/memories/repo/overview.md`'s doc count.
8. **Report back** a short summary: file created, new ID suffix, count of
   CSG/FSC/FSR/SYSR/TSC/TSR/SWR/HWR/HSI requirements added, and confirmation that Mermaid
   validation passed with 0 failures.

## Common mistakes to avoid
- Skipping the TI-doc fetch step and writing generic textbook security boilerplate instead of a
  TDA4VM/TISCI-grounded claim.
- Forgetting `4.2`/`5.2`/`6.2` requirement IDs (`HWR-*`/`SWR-*`/`HSI-*`) — every doc has all three,
  not just CSG/FSC/FSR/SYSR/TSC/TSR.
- Forgetting the Section 4.1 hardware static architecture `graph LR` diagram — every doc has three
  diagrams total (2.2 trust boundaries, 4.1 hardware static architecture, 5.1 software blocks) plus
  the 5.3 sequence diagram, not just two.
- Adding the diagram without running the real Mermaid parser — `get_errors` will not catch syntax
  errors like semicolons inside message text or reserved-word aliases.
