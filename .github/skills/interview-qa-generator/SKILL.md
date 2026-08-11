---
name: interview-qa-generator
description: 'Generate realistic technical interview practice questions and grounded model answers from this repo TDA4VM ADAS ECU cybersecurity requirements documents and verified TI TISCI facts (secure boot, JTAG/debug unlock, UDS SecurityAccess, SecOC, secure logging, OTA/reprogramming, RTMD, secure storage/KEK/DKEK/keyring). Use when the user asks for interview questions, a mock interview, practice Q&A, or wants to quiz themselves on a topic covered by this repo.'
---

# Interview Q&A Generator (TDA4VM ADAS ECU)

Turns this repo's grounded facts and requirements into interview-style practice questions. Always
source answers from [the domain skill](../automotive-cybersecurity-requirements/SKILL.md) and the
specific `TDA4VM_*_Requirements.md` file(s) in scope — never invent a TI/TISCI detail to make an
answer sound more complete.

## Procedure

1. **Scope the topic(s)** the user wants to practice (e.g., "secure boot", "secure storage", or
   "everything"). Read the corresponding requirements doc(s) and the relevant grounded-facts section
   of the domain skill before generating questions.
2. **Generate a mix of question types and difficulty levels**:
   - **L1 recall**: "Which TISCI message authenticates a processor core during boot?" /
     "What's the SHA/RSA combination used for TDA4VM boot authentication?"
   - **L2 applied**: "Walk through what happens if `SecurityAccess sendKey` is wrong three times in a
     row" / "Which NRC is returned and why?"
   - **L3 design/tradeoff**: "Why does the repo recommend SA2UL-resident DKEK (Approach 1) over
     host-supplied DKEK (Approach 2), and what's the residual risk of Approach 1?"
   - **Nuance/gotcha**: pull directly from "Nuance" callouts in the domain skill (e.g., "Why can't a
     BootROM-stage authentication failure be written to the secure log?").
   - **Scenario**: "An attacker has physical access to a decommissioned ECU and desolders the flash.
     What in this repo's secure storage design prevents them from using the recovered ciphertext on
     another vehicle?" (pairs well with the iso21434-tara-grounding skill for the "why" framing).
3. **Answer format**: give a concise model answer, then a one-line citation of which CSR/TSC/TSR ID
   and/or which TI mechanism (TISCI message, eFuse field, standard clause) backs it up, so the answer
   is verifiable against the source doc rather than free-floating.
4. **If a question would require a fact not present in the domain skill or the target doc**, say so
   explicitly rather than guessing, and offer to fetch the relevant TI page first (see the domain
   skill's reference documentation list) before answering.
5. **Delivery**: present as a numbered Q&A list in chat by default. Only write a markdown file if the
   user explicitly asks to save the question set.

## Example (secure storage topic)

**Q (L2 applied):** A host calls `TISCI_MSG_CRYPTO_GET_DKEK` instead of `SET_DKEK`. What extra
responsibility does that push onto the host, and why might you avoid this approach if possible?
**A:** With `GET_DKEK`, System Firmware returns the raw derived key to the host, which must then
firewall its own memory to keep it secret — unlike `SET_DKEK`, where the key is programmed directly
into SA2UL registers and never leaves the crypto engine. TI recommends the `SET_DKEK` approach
wherever hardware acceleration is available for exactly this reason.
*(TSR-STO-3, TSR-STO-4 — `TDA4VM_Secure_Storage_Requirements.md`)*
