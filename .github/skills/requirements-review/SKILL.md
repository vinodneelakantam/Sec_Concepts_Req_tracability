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
For each doc, confirm all of these headings exist, in order, with a mermaid block where required:
```
## 1. System Static Architecture
### 1.1 System entities
### 1.2 Trust boundaries and interfaces        <- must contain a ```mermaid graph LR``` block
### 1.3 System-level requirement allocation    <- full CSR/FSC/FSR/FCR/TCR text under bold subheadings
## 2. Hardware Static Architecture
### 2.1 Hardware elements
### 2.2 Hardware responsibility mapping
## 3. Software Static Architecture
### 3.1 Software blocks                        <- must contain a ```mermaid graph LR``` block
### 3.2 Software requirement allocation
## 4. Dynamic / Behavioral Views
### 4.1 [sequence name]                         <- must contain a ```mermaid sequenceDiagram``` block
### 4.2 Behavioral requirement focus
```
Flag: missing sections, sections out of order, or a `1.3`/`3.1`/`4.1` missing its mermaid block.

### 2. No bare ID ranges (hard rule)
Search each file's Section 1.3 for a bare range pattern instead of spelled-out text, e.g.
`CSR-XXX-1 to CSR-XXX-5` or `CSR-XXX-1..5`. This is an automatic fail — every CSR/FSC/FSR/FCR/TCR
must be its own full sentence under a bold heading.

### 3. ID taxonomy consistency within a file
- Every doc should define at least one `CSR-*`, `FSC-*`, `FSR-*`, `FCR-*`, `TCR-*` (Section 1.3),
  `HWR-*` (2.2), and `SWR-*` (3.2) — flag any doc missing one of these seven categories entirely.
- IDs within a file must use one consistent topic suffix (e.g., all `CSR-STO-*`, not a mix of
  `CSR-STO-*` and `CSR-STOR-*`).
- ID numbers should be contiguous/sequential within a category, starting at 1, with no gaps or
  duplicates inside the same file.

### 4. Cross-document ID collisions
Extract every requirement ID across all files and check for accidental collisions (two different
docs both claiming `CSR-STO-1`, for instance, other than the intentionally bare-suffix boot doc):
```bash
grep -n -oE '(CSR|FSC|FSR|FCR|TCR|HWR|SWR)-[A-Z]*-?[0-9]+' TDA4VM_*_Requirements.md | sort -t: -k2
```
Any ID string appearing under two different topic suffixes with the same file scope is a bug.

### 5. Section 4.2 traceability
Every bullet in `4.2 Behavioral requirement focus` should parenthetically cite at least one ID
declared in `1.3`/`2.2`/`3.2` of the same file. Flag:
- IDs cited in `4.2` that were never declared anywhere in the file (typo or renamed ID).
- IDs declared in `1.3`/`2.2`/`3.2` that are never cited anywhere in `4.2` (orphaned requirement —
  no behavioral evidence it's actually implemented/tested by the sequence diagram).

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
