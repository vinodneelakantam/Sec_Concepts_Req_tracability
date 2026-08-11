---
name: automotive-cybersecurity-requirements
description: 'Automotive cybersecurity requirements engineering for a TDA4VM (TI Jacinto 7 / J721E) ADAS ECU: secure boot, JTAG/debug, secure access (UDS SecurityAccess), secure communication (SecOC), secure logging, OTA/FOTA/SOTA, secure reprogramming, and runtime tamper monitoring. Use when writing, reviewing, or extending CSR/FSC/FSR/SYSR/TSC/TSR/SWR/HWR/HSI requirement documents in this repo, grounding technical claims in real TI TDA4VM/TISCI facts instead of generic assumptions, drawing on ISO 21434 / ISO 14229 / AUTOSAR SecOC concepts, or authoring/validating Mermaid architecture and sequence diagrams for these documents.'
---

# Automotive Cybersecurity Requirements (TDA4VM ADAS ECU)

This repo tracks cybersecurity requirements for a TDA4VM (TI Jacinto 7 / J721E) ADAS ECU across
9 topic documents. The goal is **reality-grounded** requirements engineering for learning/interview
prep, not generic textbook boilerplate — always prefer a verified chip/standard fact over a
plausible-sounding invented one.

## Repo document set

| File | Topic |
|---|---|
| `TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements.md` | Secure/authentic boot chain + runtime integrity (most safety/security-critical doc) |
| `TDA4VM_Secure_JTAG_Requirements.md` | Debug/JTAG access control |
| `TDA4VM_SecureAccess_Requirements.md` | UDS SecurityAccess (diagnostic protected services) |
| `TDA4VM_Secure_Communication_Requirements.md` | In-vehicle (SecOC-style) + off-board comms |
| `TDA4VM_Secure_Logging_Requirements.md` | Tamper-evident security event logging |
| `TDA4VM_OTA_FOTA_SOTA_Requirements.md` | Over-the-air update security |
| `TDA4VM_Secure_Reprogramming_Requirements.md` | UDS-based flashing/reprogramming |
| `TDA4VM_RTMD_Requirements.md` | Runtime Tamper Monitoring and Detection |
| `TDA4VM_Secure_Storage_Requirements.md` | Secure storage of keys/credentials/secrets at rest (KEK/DKEK, keyring, extended OTP) |

## Document structure convention (every file follows this exactly)

The structure mirrors an end-to-end concept-to-interface flow: **FSC (→FSR) → System Requirements
+ System Static Architecture → TSC (→TSR) → Hardware Requirements + Hardware Static Architecture →
Software Requirements + Software Static & Dynamic Architecture → HSI**.

```
## 1. Functional Security Concept
### 1.1 Cybersecurity Requirements (CSR)        <- full requirement text, NOT bare "ID-1 to ID-5" ranges
### 1.2 Functional Security Concept (FSC)
### 1.3 Functional Security Requirements (FSR)
## 2. System Requirements and System Static Architecture
### 2.1 System entities
### 2.2 Trust boundaries and interfaces   (+ mermaid `graph LR`)
### 2.3 System Requirements (SYSR)             <- new system-level allocation between FSR and TSC
## 3. Technical Security Concept
### 3.1 Technical Security Concept (TSC)
### 3.2 Technical Security Requirements (TSR)
## 4. Hardware Requirements and Hardware Static Architecture
### 4.1 Hardware elements   (+ mermaid `graph LR` hardware static architecture diagram)
### 4.2 Hardware Requirements (HWR)
## 5. Software Requirements and Software Static & Dynamic Architecture
### 5.1 Software blocks   (+ mermaid `graph LR`)
### 5.2 Software Requirements (SWR)
### 5.3 [sequence name]   (+ mermaid `sequenceDiagram` with explicit alt/opt failure paths)
### 5.4 Behavioral requirement focus
## 6. Hardware-Software Interface (HSI)
### 6.1 HSI elements
### 6.2 HSI Requirements (HSI)
```

Requirement ID taxonomy used consistently: **CSR** (Cybersecurity Requirement, item-level) →
**FSC** (Functional Security Concept, the overarching strategy for realizing the CSRs) →
**FSR** (Functional Security Requirements, decomposed testable functional requirements, still
implementation-agnostic) → **SYSR** (System Requirement, system-level allocation across the
entities/trust boundaries in Section 2) → **TSC** (Technical Security Concept — renamed from the
older FCR/"Functional Cybersecurity Concept" label) → **TSR** (Technical Security Requirements,
TDA4VM-specific — renamed from the older TCR/"Technical Cybersecurity Concept" label) → **HWR**
(Hardware Requirement) / **SWR** (Software Requirement) → **HSI** (Hardware-Software Interface
Requirement, register/API/message-level contract between the hardware in Section 4 and the
software in Section 5). Each file uses a topic suffix, e.g. `CSR-SA-1` (Secure Access), `CSR-JTAG-1`,
`CSR-OTA-1`, `CSR-SRP-1` (reprogramming), `CSR-RTMD-1`, `CSR-LOG-1`, `CSR-COM-1`, `CSR-STO-1`
(secure storage), with matching `FSC-<suffix>-n`/`FSR-<suffix>-n`/`SYSR-<suffix>-n`/
`TSC-<suffix>-n`/`TSR-<suffix>-n`/`HSI-<suffix>-n` IDs, and the boot doc uses bare
`CSR-1`/`FSC-1`/`FSR-1`/`SYSR-1`/`TSC-1`/`TSR-1`/`HSI-1`.

**Rule:** Sections 1.1-1.3 must always spell out full requirement text under their own subheadings
— never collapse to an ID range like "CSR-SA-1 to CSR-SA-5". Section 2.3 (SYSR) and Section 6.2
(HSI) are new content, not renamed from an earlier taxonomy — write them fresh per topic, grounded
in that doc's own Section 2 entities/boundaries (for SYSR) and Section 4/5 hardware+software blocks
(for HSI), never invented boilerplate.

**Rule:** Section 4.1 must include a `graph LR` hardware static architecture diagram, exactly like
Section 2.2's trust-boundary diagram and Section 5.1's software-block diagram — a doc with only a
bullet list of hardware elements and no diagram is incomplete. This diagram shows physical/hardware
component wiring (DMSC, eFuse, SA2UL, cores, flash, JTAG, mailbox/IPC, peripherals), distinct from
the system-entity/trust-boundary view in 2.2 and the software-module view in 5.1.

## Grounded TDA4VM/J721E facts (verified against TI TISCI documentation)

- **DMSC** (Device Management and Security Controller): dedicated Cortex-M3 core. Executes the
  **immutable BootROM** at power-on, then hosts **System Firmware** (SYSFW, aka **TIFS** in newer
  TI SDKs), which exposes the **TISCI** message API.
- Compute domains: dual Cortex-A72 (HLOS: Linux/QNX), 6x Cortex-R5F (real-time/safety incl. secondary
  bootloader/SBL), C7x DSP, GPU, vision accelerators.
- **SA2UL**: hardware crypto accelerator, confirmed specific to J721E/TDA4VM (newer chips like
  J721S2/J722S/J784S4 use SA3UL instead — don't conflate).
- **eFuse array** holds: hash of customer root-of-trust public keys (**SMPK**/**BMPK**), **KEYREV**
  (selects active key: 1=SMPK, 2=BMPK), **SWREV** (monotonic anti-rollback counter), device security
  type (GP/HS-FS/HS-SE), and a permanent JTAG-disable flag.
- **Authentication mechanism**: X.509 certificates, **RSA-4K** signature (RSASSA-PKCS1-v1_5,
  RFC-8017) over a **SHA2-512** payload hash, verified against the eFuse SMPK/BMPK key hash.
- Key **TISCI messages**: `TISCI_MSG_PROC_AUTH_BOOT` (authenticate/release a processor core),
  `TISCI_MSG_OPEN_DEBUG_FWLS` (JTAG unlock via message channel), `TISCI_MSG_DISABLE_JTAG_UNLOCK`
  (permanent efuse-based JTAG lockout), `TISCI_MSG_GET_SOC_UID`.
- **Boot chain (grounded, use this exact order)**: DMSC immutable BootROM → System Firmware/TIFS →
  R5F SBL → A72 application. Each stage authenticates the next via `TISCI_MSG_PROC_AUTH_BOOT`.
  Do NOT use the older generic "RBL → TIFS → SBL" phrasing — it's imprecise about which stage does
  the immutable first-boot authentication.
  - **Nuance**: a BootROM-stage authentication failure cannot be logged via the normal secure
    logging path since no software has run yet — it's only observable as a boot-fail status/error
    pin. System Firmware is the first stage capable of writing an actual log entry.
- **JTAG/debug default state depends on device security type, not a single fixed default**:

  | Device type | M3/DMSC JTAG | Other core JTAG |
  |---|---|---|
  | GP (General Purpose) | Open | Open |
  | HS-FS (Field Securable) | Closed | Open |
  | HS-SE (Security Enforced) | Closed | Closed |

  Debug unlock requires a distinct **X.509 debug certificate** (not the boot cert) with extensions
  `debugUID`, `debugType`, `coreDbgEn`, `coreDbgSecEn`, and a Software Revision Extension, signed by
  SMPK/BMPK. Validation checks: cert revision ≥ `min_cert_rev`, UID match (unless
  `allow_wildcard_unlock` — dev/lab only, never with production keys), requested privilege/core
  scope. Delivered via `TISCI_MSG_OPEN_DEBUG_FWLS` message OR Sec-AP (Secure Access Point) over JTAG
  pins (used by CCS `dbgauth`), depending on whether the host already has message-channel access.
  Board config controls: `allow_jtag_unlock`, `allow_wildcard_unlock`, `min_cert_rev`,
  `jtag_unlock_hosts`. The M3/DMSC JTAG path can never be software-opened on HS-FS/HS-SE.

## Secure storage primitives (KEK/DKEK, keyring, extended OTP) — verified TISCI facts

- **KEK** (Key Encryption Key): a randomly generated 256-bit key burned into eFuse at TI factory on
  HS devices, unique per device, not correlated across devices, and never retained in any TI
  database/tester. Reachable only via the DMSC AES engine's register interface (no DMA path) —
  it is never exposed to software directly.
- **DKEK** (Derived KEK): host requests a key derived from KEK using CMAC as a PRF in counter mode
  (NIST SP 800-108 §5.1) over a `label` + `context` (combined ≤ 41 bytes, limited by the TISCI
  secure message header) plus the requesting host's ID folded in by System Firmware — so each host
  gets a distinct derived key. Deterministic per device/host/label/context (same inputs → same key
  across reboots on one device), but differs across devices since the underlying KEK differs.
  Two delivery approaches: **Approach 1** — `TISCI_MSG_CRYPTO_SET_DKEK` programs the DKEK straight
  into SA2UL DKEK registers (never exposed outside SA2UL), gated by a SA2UL DKEK PrivID register
  matching only the requesting host, used via the `USE_DKEK` security-context flag, released via
  `TISCI_MSG_CRYPTO_RELEASE_DKEK`; **Approach 2** — `TISCI_MSG_CRYPTO_GET_DKEK` returns the raw DKEK
  value to the host, who must firewall it themselves (usable via SA2UL or CPU). TI recommends
  Approach 1 wherever possible. Caveat: PrivID gating ignores secure/non-secure and
  privileged/user attributes, so secure and non-secure code sharing a core (and PrivID) could both
  reach a still-programmed DKEK unless it's released promptly.
- **Symmetric/public keyring**: a bulk, one-time-importable set of up to 6 asymmetric (RSA-4096/
  RSA-3072 hash) + 6 symmetric (AES-256 only) auxiliary keys, imported via
  `TISCI_MSG_KEYRING_IMPORT` as a blob signed with the active SMPK/BMPK (symmetric keys additionally
  must be encrypted with SMEK/BMEK — import fails otherwise). Each key gets a `key_id` (1-254) and,
  for symmetric keys, a `key_rights` bitmask (`image_enc_dec` / `CSP_decrypt` / `HKDF`) restricting
  which operations it may be used for. Public/symmetric/combined keyring import is strictly one-time
  — any later re-import attempt fails, by design (no silent key replacement).
- **Cryptographic Services (CSP)**: TIFS API to encrypt/decrypt a data blob via AES-ECB/CBC/GCM.
  Caller supplies a context struct (`revision`, `mode`, `key_size`, `key_id`, `iv`, `tag`, ...):
  if `key_id` is non-zero it references an already-imported symmetric keyring key (key material
  never crosses the host/firmware boundary again); if `key_id` is zero the raw key is supplied
  in-context for one-off use. AES-GCM mode produces/verifies a 16-byte tag.
- **Extended OTP**: a 1024-bit customer general-purpose eFuse region (distinct from the fixed-purpose
  root-of-trust key area), organized in device-specific hardware rows (25/32/41 bits wide on
  J721E/TDA4VM). Only one designated `write_host` (from security board config) may write; each row
  can be marked secure (raw value withheld from TISCI read responses, usable only to set up
  crypto contexts) or non-secure (readable in the clear by the owning host). Writes are row-masked
  (`TISCI_MSG_WRITE_OTP_ROW`); locking is either a **soft** global lock
  (`TISCI_MSG_SOFT_LOCK_OTP_WRITE_GLOBAL`, blocks all further writes until next reset) or a
  **permanent** per-row lock (`TISCI_MSG_LOCK_OTP_ROW`, survives resets forever).

## Automotive standards vocabulary used for nuance/realism

- **ISO 14229-1 (UDS)**: SecurityAccess is service `0x27` (odd subfunction = requestSeed, even =
  sendKey). Relevant NRCs: `0x35` invalidKey, `0x36` exceedNumberOfAttempts, `0x37`
  requiredTimeDelayNotExpired. Reprogramming flow uses `0x10` (DiagnosticSessionControl,
  programmingSession `0x02`), `0x27`, `0x31` (RoutineControl — CheckProgrammingPreconditions /
  CheckProgrammingDependencies / EraseMemory), `0x34`/`0x36`/`0x37` (RequestDownload/TransferData/
  RequestTransferExit), `0x11` (ECUReset to trigger activation).
- **AUTOSAR SecOC** (Secure Onboard Communication): per-PDU freshness value (truncated counter) +
  MAC (e.g. AES-128-CMAC truncated to configured length) appended to the Authentic PDU. Freshness
  and MAC are checked independently — a valid MAC with stale freshness is still a replay and must
  be dropped.
- **ISO 21434**: source of the CSR/FSC-FSR/TSC-TSR concept-layer vocabulary (item-level
  cybersecurity requirement → functional concept → technical concept).
- Dual-bank (A/B) flash pattern for OTA/reprogramming: candidate writes only ever touch the inactive
  bank; activation re-enters the full DMSC BootROM chain and reverts to the last known-good bank on
  verification failure.

## Mermaid diagram authoring rules (hard-won from real parse failures)

Always validate with the real parser, not just eyeballing — see
[the validation procedure](#validating-mermaid-diagrams-for-real) below. Concrete rules:

1. Use `graph LR` not `flowchart LR` for the static-architecture diagrams (compatibility).
2. Never chain edges in one flowchart line like `A -->|label| B --> C` — split into separate edge
   lines.
3. In `sequenceDiagram` blocks: **never use a semicolon (`;`) inside message text** — Mermaid treats
   `;` as a statement separator (like a newline), silently truncating the message and breaking the
   parse. Use a comma instead.
4. **Never use a reserved keyword as a participant alias**, even with different casing — e.g. an
   alias `Off` collides with the `off` keyword used in `autonumber on/off`-style directives.
   Reserved words to avoid as aliases: `end`, `alt`, `opt`, `loop`, `par`, `and`, `else`, `note`,
   `activate`, `deactivate`, `autonumber`, `on`, `off`, `rect`, `box`, `critical`, `option`, `break`.
5. **Never embed an arrow-like token (`->`, `-->`) inside message text** (e.g.
   `A->>A: X -> Y -> Z`) — rewrite using "then" instead; it can confuse the arrow lexer.
6. Every `alt`/`opt`/`loop` must have a matching `end`; every `else` must be inside an open `alt`.
7. Give every sequence diagram explicit failure/`alt` branches (auth failure, validation failure,
   lockout, rollback) — a diagram with only the happy path reads as unrealistic to a security
   reviewer.

### Validating Mermaid diagrams for real

`get_errors` (VS Code diagnostics) does **not** catch Mermaid syntax errors. To truly validate,
install a portable Node.js (no root needed) and run the real `mermaid` parser:

```bash
mkdir -p ~/.local/opt && cd ~/.local/opt
curl -s -O https://nodejs.org/dist/v20.17.0/node-v20.17.0-linux-x64.tar.xz
tar xf node-v20.17.0-linux-x64.tar.xz
export PATH="$HOME/.local/opt/node-v20.17.0-linux-x64/bin:$PATH"

mkdir -p ~/.local/mermaid-check && cd ~/.local/mermaid-check
npm init -y >/dev/null 2>&1
npm install mermaid@10 jsdom@21 --no-audit --no-fund   # jsdom@22+ crashes under CJS require
```

Then run a script that creates a `jsdom` window/document, imports `mermaid`, extracts every
` ```mermaid ` block from the target `.md` files via regex, and calls `await mermaid.parse(code)`
on each, catching/printing errors. (jsdom v21 is the last version compatible with a plain
`require`-based Node script; v22+ pulls in an ESM-only `@csstools/css-calc` dependency that crashes.)

## Reference documentation (verified live, fetch again if TI reorganizes)

Use `fetch_webpage` on these before adding new grounded facts — don't invent TI-specific details
from memory. All links below were confirmed reachable.

**TDA4VM product / chip level**
- Product page (features, product overview): https://www.ti.com/product/TDA4VM
- Datasheet (Rev. L): https://www.ti.com/lit/gpn/TDA4VM (HTML: https://www.ti.com/document-viewer/TDA4VM/datasheet)
- J721E/DRA829/TDA4VM Technical Reference Manual (Rev. D): https://www.ti.com/lit/zip/SPRUIL1

**TISCI User Guide** (root: https://software-dl.ti.com/tisci/esd/latest/index.html)
- Ch.1 Introduction: https://software-dl.ti.com/tisci/esd/latest/1_intro/TISCI.html
- Ch.2 TISCI Message Documentation (PROC_AUTH_BOOT, OPEN_DEBUG_FWLS, etc.): https://software-dl.ti.com/tisci/esd/latest/2_tisci_msgs/index.html
- Ch.3 Security Board Configuration (`allow_jtag_unlock`, `allow_wildcard_unlock`, `min_cert_rev`, `jtag_unlock_hosts`): https://software-dl.ti.com/tisci/esd/latest/3_boardcfg/BOARDCFG_SEC.html
- Ch.5 SoC Family Specific Docs, J721E section: https://software-dl.ti.com/tisci/esd/latest/5_soc_doc/index.html#j721e
- Ch.6 Topic Guide — System Firmware Authentication and Decryption Requests: https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/authentication.html
- Ch.6 Topic Guide — Signing binaries for Secure Boot on HS Devices: https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/secure_boot_signing.html
- Ch.6 Topic Guide — Secure Debug User Guide (device security type table, debug cert fields): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/secure_debug.html
- Ch.6 Topic Guide — Run time read/write to KEYREV and SWREV: https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/otp_revision.html
- Ch.6 Topic Guide — Using Extended OTP (eFuse layout background): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/extended_otp.html
- Ch.6 Topic Guide — Key Writer: https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/key_writer.html
- Ch.6 Topic Guide — Using OpenSSL for certificate creation (X.509 cert structure/signing in practice): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/openssl_usage.html
- Ch.6 Topic Guide — Cryptographic Services (SA2UL-backed crypto ops exposed via TISCI): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/csp.html
- Ch.6 Topic Guide — Keyring Management (public/symmetric auxiliary keyring import): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/keyring.html
- Ch.6 Topic Guide — Using Derived KEK on HS devices (DKEK derivation/usage): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/dkek_management.html
- Ch.6 Topic Guide — RSASSA-PSS Signature Algorithm: https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/signature_algos.html
- Ch.6 Topic Guide — Firewall FAQ (SA2UL/peripheral firewall access control via TISCI): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/firewall_faq.html
- Ch.6 Topic Guide — Mailbox IPC (host-to-DMSC transport underlying TISCI messages): https://software-dl.ti.com/tisci/esd/latest/6_topic_user_guides/mailbox_ipc.html

**Non-TI standards referenced for realism** (verify current edition/scope before quoting specifics)
- ISO 14229-1 (UDS) — SecurityAccess `0x27`, RequestDownload/TransferData/RequestTransferExit
  `0x34/0x36/0x37`, RoutineControl `0x31`, ECUReset `0x11`, NRCs `0x35/0x36/0x37`.
- ISO 21434 — cybersecurity engineering lifecycle; source of the CSR/FSC-FSR/TSC-TSR concept-layer split.
- AUTOSAR SecOC (Secure Onboard Communication) specification — freshness value + MAC framing.
- ISO 24089 — software update engineering (OTA/campaign concepts referenced loosely, not quoted).

## Workflow for adding/editing a requirement doc

1. Follow the exact 6-section structure above.
2. Ground every hardware/technical claim in the facts and references above (fetch the relevant TI
   page if unsure) rather than inventing plausible-sounding generic security architecture.
3. Write full requirement text in Sections 1.1-1.3, 2.3, 3.1-3.2, 4.2, 5.2, and 6.2 (never bare ID ranges).
4. Give the Section 5.3 sequence diagram explicit success **and** failure branches referencing real
   protocol elements (UDS service IDs, TISCI messages, NRCs, SecOC fields) as applicable.
5. Run the Mermaid validation procedure above before considering diagram edits done.

## Environment notes for this workspace

- `rg` (ripgrep) is not installed — use `grep`.
- No passwordless `sudo` — don't rely on `apt install`; download portable toolchains instead
  (see Node.js example above).
