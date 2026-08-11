---
name: iso21434-tara-grounding
description: 'Ground new or existing TDA4VM ADAS ECU CSR/FCR/TCR requirements in ISO 21434 Threat Analysis and Risk Assessment (TARA) vocabulary: assets, damage scenarios, threat scenarios/attack paths, impact rating (Safety/Financial/Operational/Privacy), attack feasibility rating, and risk treatment. Use when the user asks to justify, motivate, add rationale to, or run a TARA/threat analysis for a requirement, or asks "why do we need this requirement".'
---

# ISO 21434 TARA Grounding (TDA4VM ADAS ECU)

Adds the "why" layer underneath a CSR. This repo's requirement text (see
[the domain skill](../automotive-cybersecurity-requirements/SKILL.md)) states *what* is required;
TARA rationale explains *why*, using ISO 21434's threat/risk vocabulary.

## Core vocabulary (ISO 21434)

1. **Asset** — something of value on the item that could be damaged (e.g., a stored credential, the
   boot chain's integrity, the JTAG debug port).
2. **Damage scenario** — the adverse consequence if the asset is compromised, rated across four
   impact categories: **Safety (S)**, **Financial (F)**, **Operational (O)**, **Privacy (P)**, each
   on a qualitative scale (commonly Severe / Major / Moderate / Negligible).
3. **Threat scenario** — how an asset's cybersecurity property (confidentiality/integrity/
   availability/authenticity) could be compromised, described as an **attack path**: attacker
   entry point → exploited weakness → resulting compromise.
4. **Attack feasibility rating** — qualitative or parameter-based estimate of how hard the attack
   path is to execute (factors: elapsed time, required expertise, knowledge of the item/TI internals
   needed, window of opportunity, equipment needed). Typically bucketed Low / Medium / High /
   Very High feasibility.
5. **Risk value** — combination of impact rating and attack feasibility; drives a **risk treatment**
   decision: reduce (add/strengthen a CSR), share/transfer, avoid (remove the feature), or retain
   (accept residual risk, usually only for Negligible impact).

## Procedure to ground a CSR

1. Identify the **asset** the CSR protects (name it precisely — "the SA2UL-derived DKEK", not
   "the key").
2. Write the **threat scenario**: attacker capability + entry point + exploited weakness, using real
   interfaces from the domain skill (JTAG/Sec-AP, UDS diagnostic session, TISCI mailbox, OTA channel,
   extended OTP write host, etc.) rather than a generic "attacker gains access".
3. Write the **damage scenario** and rate S/F/O/P impact. For an ADAS ECU, Safety impact is usually
   the dominant driver (e.g., a forged perception input or a rolled-back vulnerable firmware image
   affecting driving decisions).
4. Rate **attack feasibility** — be honest about what's actually hard on this chip: e.g., extracting
   the DMSC-resident KEK is rated very low feasibility because it's eFuse-protected and only
   reachable via a register-only AES engine with no DMA path (grounded fact from the domain skill);
   a weak UDS SecurityAccess seed/key scheme is comparatively higher feasibility.
5. State the **risk treatment**: name the specific CSR/FCR/TCR ID(s) in this repo that reduce the
   risk, and briefly say how (e.g., "reduced via CSR-STO-2 + TCR-STO-1/TCR-STO-2, which bind secret
   confidentiality to a device-unique hardware KEK so extraction from one ECU doesn't help on
   another").

## Worked example (grounded in this repo)

- **Asset**: an application credential stored at rest in the protected NvM partition.
- **Threat scenario**: an attacker with physical possession of a decommissioned/salvaged ECU desolders
  and reads the flash directly, attempting to recover the plaintext credential.
- **Damage scenario**: credential reuse enables impersonation against a backend service — rated
  Major Financial/Operational impact, Negligible Safety impact (the credential alone doesn't affect
  driving behavior).
- **Attack feasibility**: Medium — reading raw flash is straightforward with common tools, but the
  data is useless without the device-specific KEK/DKEK, which is High/Very-Low feasibility to extract
  (register-only AES engine, no DMA, per TCR-STO-1).
- **Risk treatment**: retained residual risk is low because CSR-STO-2 (device-bound confidentiality)
  and TCR-STO-1/TCR-STO-2 (KEK/DKEK derivation) mean the extracted ciphertext is not decryptable off
  the original device — no new CSR needed; existing ones already treat this threat scenario.

## Where to put the rationale
Do **not** change the repo's mandatory 4-section document structure to add a TARA section inline —
the domain skill's structure convention is followed "exactly" by every file. Instead:
- Present TARA rationale in chat as the deliverable, or
- If the user wants it persisted, ask whether it should go in session memory, a repo memory note, or
  (only if explicitly requested) a separate rationale/appendix file — do not silently restructure an
  existing requirements doc.
