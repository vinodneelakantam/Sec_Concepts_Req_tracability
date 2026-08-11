---
name: traceability-matrix
description: 'Generate or refresh a cross-document requirement traceability matrix for the TDA4VM ADAS ECU cybersecurity requirements repo, mapping CSR/FCR/TCR/SWR/HWR IDs across all TDA4VM_*_Requirements.md files and flagging orphaned or undeclared requirement IDs. Use when the user asks for a traceability matrix, RTM, requirement coverage table, or "how do requirements map across documents".'
---

# Cross-Document Traceability Matrix (TDA4VM ADAS ECU)

This repo does not use explicit `traces-to:` metadata fields — traceability is inferred from the
shared per-file topic ID suffix (see the ID taxonomy in
[the domain skill](../automotive-cybersecurity-requirements/SKILL.md)) plus the ID citations that
appear in each file's `4.2 Behavioral requirement focus` section. Be transparent about this
inference when presenting the matrix — it is not a formally-linked RTM.

## Procedure

1. **Extract every requirement ID and its text** from each `TDA4VM_*_Requirements.md`:
   ```bash
   grep -n -E '^- (CSR|FCR|TCR|HWR|SWR)-' TDA4VM_*_Requirements.md
   ```
2. **Build the per-document summary table**:

   | Doc | Topic suffix | CSR count | FCR count | TCR count | HWR count | SWR count |
   |---|---|---|---|---|---|---|

3. **Build the ID-level matrix** per document, one row per CSR, showing which FCR/TCR/SWR/HWR IDs
   were cited alongside it in `4.2` (this is the closest thing this repo has to a "supports" link):

   | CSR ID | CSR text (short) | Cited with (FCR/TCR/SWR/HWR IDs from 4.2) | Cited in 4.2? |
   |---|---|---|---|

4. **Flag orphans and typos**:
   - **Undeclared-but-cited**: an ID appears in `4.2` prose but was never declared in `1.3`/`2.2`/`3.2`
     of the same file → likely a typo or renamed ID, needs a fix.
   - **Declared-but-never-cited**: an ID exists in `1.3`/`2.2`/`3.2` but never appears in any `4.2`
     bullet in the same file → the requirement has no behavioral narrative demonstrating it, worth
     a follow-up (either add a citation or accept it's a static/architectural-only requirement).
   - **Cross-file collisions**: the same ID string declared in two different files (see the
     requirements-review skill's collision check) — a matrix built without deduplicating this will
     silently merge two unrelated requirements.
5. **Present the matrix in chat as markdown tables** by default. Only write it to a file (e.g.
   `TRACEABILITY_MATRIX.md`) if the user explicitly asks for a persisted file — do not create
   documentation files unprompted.
6. **Re-run after any doc is added or edited** (pairs naturally with the requirements-doc-scaffolding
   skill's bookkeeping step and the requirements-review skill's collision check).

## Interpreting results
- A high "declared-but-never-cited" count in one doc is not necessarily wrong — some CSRs are purely
  architectural (e.g., a hardware constraint) and may not need a dynamic-view citation. Use judgment,
  don't auto-flag as a defect without checking whether Section 4.2 realistically could reference it.
- A CSR with zero supporting FCR/TCR anywhere in the same file's Section 1.3 is a stronger signal of
  a real gap — every CSR should have at least one FCR/TCR path realizing it.
