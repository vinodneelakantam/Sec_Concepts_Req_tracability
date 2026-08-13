---
name: requirements-review
description: 'Audit/review one or all TDA4VM ADAS ECU cybersecurity requirements documents (TDA4VM_*_Requirements.md) for structural drift, ID taxonomy problems, cross-document ID collisions, ungrounded/generic security claims, and Mermaid diagram defects. Use when the user asks to review, check, audit, lint, or find problems/inconsistencies in one or more requirements docs in this repo.'
---

# Requirements Review / Audit (TDA4VM ADAS ECU)

A checklist-driven audit procedure for the requirements docs in this repo. Pairs with
[the domain skill](../automotive-cybersecurity-requirements/SKILL.md) (structure convention, ID
taxonomy, Mermaid rules) — read it first if unfamiliar with the conventions being checked.

## Checklist

### 1. Structural conformance
For each doc, confirm all of these headings exist, in order, with a mermaid block where required.
The structure mirrors the flow **FSC (→FSR) → System Requirements + System Static Architecture →
TSC (→TSR) → Hardware Requirements + Hardware Static Architecture → Software Requirements +
Software Static & Dynamic Architecture → HSI**:
```
## 1. Functional Security Concept
### 1.1 Cybersecurity Goals (CSG)
### 1.2 Functional Security Concept (FSC)
### 1.3 Functional Security Requirements (FSR)
## 2. System Requirements and System Static Architecture
### 2.1 System entities
### 2.2 Trust boundaries and interfaces        <- must contain a ```mermaid graph LR``` block
### 2.3 System Requirements (SYSR)
## 3. Technical Security Concept
### 3.1 Technical Security Concept (TSC)
### 3.2 Technical Security Requirements (TSR)
## 4. Hardware Requirements and Hardware Static Architecture
### 4.1 Hardware elements                       <- must contain a ```mermaid graph LR``` block
### 4.2 Hardware Requirements (HWR)
## 5. Software Requirements and Software Static & Dynamic Architecture
### 5.1 Software blocks                        <- must contain a ```mermaid graph LR``` block
### 5.2 Software Requirements (SWR)
### 5.3 [sequence name]                         <- must contain a ```mermaid sequenceDiagram``` block
### 5.4 Behavioral requirement focus
## 6. Hardware-Software Interface (HSI)
### 6.1 HSI elements
### 6.2 HSI Requirements (HSI)
```
Flag: missing sections, sections out of order, or a `2.2`/`4.1`/`5.1`/`5.3` missing its mermaid block.

### 2. No bare ID ranges (hard rule)
Search each file's Sections 1.1-1.3, 2.3, 3.1-3.2, 4.2, 5.2, 6.2 for a bare range pattern instead of
spelled-out text, e.g. `CSG-XXX-1 to CSG-XXX-5` or `CSG-XXX-1..5`. This is an automatic fail — every
CSG/FSC/FSR/SYSR/TSC/TSR/HWR/SWR/HSI must be its own full sentence under its subheading.

### 3. ID taxonomy consistency within a file
- Every doc should define at least one `CSG-*`, `FSC-*`, `FSR-*` (Section 1), `SYSR-*` (2.3),
  `TSC-*`, `TSR-*` (Section 3), `HWR-*` (4.2), `SWR-*` (5.2), and `HSI-*` (6.2) — flag any doc
  missing one of these nine categories entirely.
- IDs within a file must use one consistent topic suffix (e.g., all `CSG-STO-*`, not a mix of
  `CSG-STO-*` and `CSG-STOR-*`).
- ID numbers should be contiguous/sequential within a category, starting at 1, with no gaps or
  duplicates inside the same file.

### 4. Cross-document ID collisions
Extract every requirement ID across all files and check for accidental collisions (two different
docs both claiming `CSG-STO-1`, for instance, other than the intentionally bare-suffix boot doc):
```bash
grep -n -oE '(CSG|FSC|FSR|SYSR|TSC|TSR|HWR|SWR|HSI)-[A-Z]*-?[0-9]+' TDA4VM_*_Requirements.md Vulnerability_Analysis/TDA4VM_*_Requirements.md | sort -t: -k2
```
Any ID string appearing under two different topic suffixes with the same file scope is a bug.

### 5. Section 5.4 traceability
Every bullet in `5.4 Behavioral requirement focus` should parenthetically cite at least one ID
declared in Section 1, `2.3`, Section 3, `4.2`, or `5.2` of the same file. Flag:
- IDs cited in `5.4` that were never declared anywhere in the file (typo or renamed ID).
- IDs declared in Section 1, `2.3`, Section 3, or `4.2` that are never cited anywhere in `5.4`
  (orphaned requirement — no behavioral evidence it's actually implemented/tested by the sequence
  diagram).

### 6. Grounding quality (the hard, judgment-based check)
Flag generic, ungrounded security language that isn't tied to a real TI/TISCI mechanism or a named
standard, e.g.:
- Vague terms like "military-grade encryption", "AI-powered threat detection", "quantum-resistant"
  with no concrete primitive named.
- A claimed TISCI message, eFuse field, or hardware behavior that doesn't match the domain skill's
  "Grounded TDA4VM/J721E facts" section — cross-check against it, and re-fetch the relevant TI page
  if uncertain rather than assuming the doc is correct or incorrect.
- Requirements copy-pasted near-verbatim from another doc with only the topic word swapped —
  usually a sign the requirement wasn't actually specialized for the new topic's real mechanism.

### 7. Mermaid diagram defects
`get_errors` does **not** catch Mermaid syntax errors. Run the real parser validation procedure from
the domain skill's "Validating Mermaid diagrams for real" section against the target file(s). Also
manually scan for the specific known pitfalls even if the parser is unavailable:
- Semicolons inside sequence diagram message text (silently truncates the message).
- Reserved words used as participant aliases (`end`, `alt`, `opt`, `loop`, `par`, `and`, `else`,
  `note`, `activate`, `deactivate`, `autonumber`, `on`, `off`, `rect`, `box`, `critical`, `option`,
  `break`).
- Arrow-like tokens (`->`, `-->`) embedded inside message text.
- Every `alt`/`opt`/`loop` has a matching `end`, every `else` inside an open `alt`.
- Sequence diagram has only a happy path with no `alt`/`opt` failure branch — flag as unrealistic.

## Output format
Report findings grouped by file, each with: check number, severity (hard fail vs. suggestion), and
the exact line/ID/quote that triggered the flag. Do not silently fix issues — summarize them and
propose the fix, then apply only what the user confirms (or proceed directly if the user's original
request was clearly "fix everything you find").
