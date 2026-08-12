---
name: interview-qa-generator
description: 'Generate realistic technical interview practice questions and grounded model answers from this repo TDA4VM ADAS ECU cybersecurity requirements documents and verified TI TISCI facts (secure boot, JTAG/debug unlock, UDS SecurityAccess, SecOC, secure logging, OTA/reprogramming, RTMD, secure storage/KEK/DKEK/keyring). Use when the user asks for interview questions, a mock interview, practice Q&A, or wants to quiz themselves on a topic covered by this repo.'
---

# Interview Q&A Generator (TDA4VM ADAS ECU)

Turns this repo's grounded facts and requirements into interview-style practice questions. Always
source answers from [the domain skill](../automotive-cybersecurity-requirements/SKILL.md) and the
specific `TDA4VM_*_Requirements.md` file(s) in scope — never invent a TI/TISCI detail to make an
answer sound more complete.

## Supported topic coverage

This generator covers the full set of TDA4VM ADAS ECU security topics represented in this repo, not only a single subject:

- Secure and authentic boot with runtime integrity
- Secure JTAG and debug access control
- UDS SecurityAccess / diagnostic access restrictions
- SecOC and secure communication protection
- Secure logging and tamper-evident audit trails
- OTA / FOTA / SOTA update integrity and activation control
- Secure reprogramming and post-flash activation security
- Runtime tamper monitoring and detection (RTMD)
- Secure storage, key provisioning, KEK, DKEK, and keyring handling
- Vulnerability analysis and continuous security monitoring

When the user asks for “all topics,” generate 20-question expert Q&A sets for each topic in this list, or for the full repo as a combined review set if the scope is “everything.”

## Procedure

1. **Scope the topic(s)** the user wants to practice (e.g., secure boot, secure storage, SecOC,
   OTA/FOTA/SOTA, or everything across the repo). Read the corresponding requirements doc(s) and the
   relevant grounded-facts section of the domain skill before generating questions.
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
3. **Answer format**: answer in an expert-level, engineering style rather than a one-liner. Each answer
   must explain the mechanism, the security rationale, the failure mode, and the evidence. Include a
   short traceability line at the end with the relevant CSR/TSC/TSR/HWR/SWR/HSI IDs and TI mechanism
   names so the answer is verifiable against the source doc instead of sounding generic.
4. **If a question would require a fact not present in the domain skill or the target doc**, say so
   explicitly rather than guessing, and offer to fetch the relevant TI page first (see the domain
   skill's reference documentation list) before answering.
5. **Delivery**: for each topic, deliver a single page or section with a table of exactly 20
   questions. Format the section as:
   - **Question #**
   - **Difficulty**
   - **Core topic / objective**
   - **Detailed model answer**
   - **Evidence / traceability**
   - Include a short intro sentence before the table: "The following expert-level Q&A set is intended
     for interview practice and design review on this topic."
   - The answer column must be detailed and substantive: 4-8 sentences minimum for each answer,
     with architecture context, trade-offs, consequences on failure, and the precise security
     principle being tested.
   - Do not use one-line answers. Do not collapse a question into a single sentence; the point is to
     simulate a real cybersecurity interview where the candidate explains the design and the risk.
6. **Table structure**: use a markdown table or equivalent tabular layout at the end of the page,
   with columns such as `# | Question | Difficulty | Detailed answer | Evidence`. Keep the answer text
   rich but readable; if needed, split the answer into a short paragraph plus the traceability line.
7. **Coverage mix**: for each topic, ensure the 20 questions are balanced across:
   - 5 L1 recall questions
   - 5 L2 applied questions
   - 5 L3 design/tradeoff questions
   - 5 scenario or nuance/gotcha questions
   This ensures the set is a realistic expert-level mock interview instead of a generic glossary dump.
8. **Topic end-of-page rule**: when asked to generate interview practice for a specific security topic,
   always place the 20-question expert Q&A table at the end of the page or output section, not at the
   beginning. The final content should read like a polished interview appendix or review sheet.

## Example (secure storage topic)

**Q (L2 applied):** A host calls `TISCI_MSG_CRYPTO_GET_DKEK` instead of `SET_DKEK`. What extra
responsibility does that push onto the host, and why might you avoid this approach if possible?
**A:** With `GET_DKEK`, System Firmware returns the raw derived key to the host, which must then
firewall its own memory to keep it secret — unlike `SET_DKEK`, where the key is programmed directly
into SA2UL registers and never leaves the crypto engine. TI recommends the `SET_DKEK` approach
wherever hardware acceleration is available for exactly this reason. The design goal is to reduce
key exposure windows: a host-held DKEK introduces an additional moving copy of a sensitive key in an
execution environment that is typically less tightly isolated than the SA2UL domain. If the host is
compromised, the attacker may recover or replay the secret even though the underlying device-level
cryptographic function remains correct. In contrast, `SET_DKEK` keeps the value inside the protected
crypto path and makes the host responsible only for issuing the right command, not for storing the
secret in user memory. This is a classic security design choice: minimize the number of privileged
copies and keep the secret in the smallest, most controlled execution domain. *(TSR-STO-3, TSR-STO-4,
`TDA4VM_Secure_Storage_Requirements.md`)*

## Expert-level Q&A deliverable template

When the user wants a full interview set, produce the response in this exact pattern:

| # | Question | Difficulty | Detailed answer | Evidence |
|---|---|---|---|---|
| 1 | ... | L1 | ...4-8 sentence engineering explanation... | ...CSR/TSC/TSR/HWR/SWR/HSI IDs + TI mechanism... |
| 2 | ... | L2 | ...design and failure-mode explanation... | ... |
| 3 | ... | L3 | ...tradeoff analysis and residual risk... | ... |
| 20 | ... | Scenario | ...real-world attack path and mitigation logic... | ... |

This template is the preferred output for every security topic in this repo. Each answer must feel
like an interview response from a cybersecurity engineer, not a textbook gloss or a single-sentence
recitation. The answer should explain the root cause, the relevant hardware/software flow, the attack
surface, and the mitigations that the repo expects. The evidence column is mandatory and should point
back to the exact requirement IDs and TI/TISCI mechanisms that support the claim.
