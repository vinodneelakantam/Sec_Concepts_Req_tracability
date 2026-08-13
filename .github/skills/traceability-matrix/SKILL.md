---
name: traceability-matrix
description: 'Generate or refresh a cross-document requirement traceability matrix for the TDA4VM ADAS ECU cybersecurity requirements repo, mapping CSG/FSC/FSR/SYSR/TSC/TSR/SWR/HWR/HSI IDs across all TDA4VM_*_Requirements.md files and flagging orphaned or undeclared requirement IDs. Use when the user asks for a traceability matrix, RTM, requirement coverage table, or "how do requirements map across documents".'
---

# Cross-Document Traceability Matrix (TDA4VM ADAS ECU)

This repo does not use explicit `traces-to:` metadata fields — traceability is inferred from the
shared per-file topic ID suffix (see the ID taxonomy in
[the domain skill](../automotive-cybersecurity-requirements/SKILL.md)) plus the ID citations that
appear in each file's `5.4 Behavioral requirement focus` section. Be transparent about this
inference when presenting the matrix — it is not a formally-linked RTM.

## Procedure

1. **Extract every requirement ID and its text** from each `TDA4VM_*_Requirements.md` (note: all
   Parking-ECU docs live under `Parking/`, and `TDA4VM_Vulnerability_Analysis_Requirements.md`
   lives under `Parking/Vulnerability_Analysis/`, not directly under `Parking/`):
   ```bash
   grep -n -E '^- (CSG|FSC|FSR|SYSR|TSC|TSR|HWR|SWR|HSI)-' Parking/TDA4VM_*_Requirements.md Parking/Vulnerability_Analysis/TDA4VM_*_Requirements.md
   ```
2. **Build the per-document summary table**:

   | Doc | Topic suffix | CSG count | FSC count | FSR count | SYSR count | TSC count | TSR count | HWR count | SWR count | HSI count |
   |---|---|---|---|---|---|---|---|---|---|---|

3. **Build the ID-level matrix** per document, one row per CSG, showing which SYSR/TSC/TSR/HWR/SWR/HSI
   IDs were cited alongside it in `5.4` (this is the closest thing this repo has to a "supports" link):

   | CSG ID | CSG text (short) | Cited with (SYSR/TSC/TSR/HWR/SWR/HSI IDs from 5.4) | Cited in 5.4? |
   |---|---|---|---|

4. **Flag orphans and typos**:
   - **Undeclared-but-cited**: an ID appears in `5.4` prose but was never declared in Section 1,
     `2.3`, Section 3, `4.2`, or `5.2` of the same file → likely a typo or renamed ID, needs a fix.
   - **Declared-but-never-cited**: an ID exists in Section 1, `2.3`, Section 3, `4.2`, or `5.2` but
     never appears in any `5.4` bullet in the same file → the requirement has no behavioral
     narrative demonstrating it, worth a follow-up (either add a citation or accept it's a
     static/architectural-only requirement).
   - **Cross-file collisions**: the same ID string declared in two different files (see the
     requirements-review skill's collision check) — a matrix built without deduplicating this will
     silently merge two unrelated requirements.
5. **Present the matrix in chat as markdown tables** by default. Only write it to a file (e.g.
   `TRACEABILITY_MATRIX.md`) if the user explicitly asks for a persisted file — do not create
   documentation files unprompted.
6. **Re-run after any doc is added or edited** (pairs naturally with the requirements-doc-scaffolding
   skill's bookkeeping step and the requirements-review skill's collision check).

## Interpreting results
- A high "declared-but-never-cited" count in one doc is not necessarily wrong — some CSGs are purely
  architectural (e.g., a hardware constraint) and may not need a dynamic-view citation. Use judgment,
  don't auto-flag as a defect without checking whether Section 4.2 realistically could reference it.
- A CSG with zero supporting SYSR/TSC/TSR anywhere in the same file's Sections 2.3/3 is a stronger
  signal of a real gap — every CSG should have at least one SYSR/TSC/TSR path realizing it.
