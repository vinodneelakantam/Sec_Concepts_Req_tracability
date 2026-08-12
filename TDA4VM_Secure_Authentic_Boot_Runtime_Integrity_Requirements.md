---
layout: default
title: Secure and Authentic Boot with Runtime Integrity
nav_title: Secure Boot
---

# Secure and Authentic Boot with Runtime Integrity Architecture Requirements - TDA4VM ADAS ECU

> Grounded in TI Jacinto 7 / TDA4VM (J721E) documentation: TISCI User Guide (System Firmware
> Authentication and Decryption Requests, Secure Debug User Guide, SoC-specific docs) and the
> TDA4VM product security feature list (secure boot, device attestation, hardware-enforced
> isolation). Where the public TI documentation does not name a mechanism explicitly, this is
> called out rather than invented.

## 1. Functional Security Concept

### 1.1 Cybersecurity Requirements (CSR)
- CSR-1: Verify integrity and authenticity of every boot-stage image before executing it.
- CSR-2: Detect tampering of running code/critical data after boot has already completed.
- CSR-3: Anchor verification in an immutable hardware root of trust, not a software-only check.
- CSR-4: Perform boot verification on every power-on/reset, independent of any prior flashing session.
- CSR-5: Gate post-reprogramming activation on the same trust chain used for ordinary power-on.
- CSR-6: Cover runtime integrity monitoring across power-on, post-reprogramming, and other operational scenarios.

### 1.2 Functional Security Concept (FSC)
- FSC-1: Root every verification decision in a hardware-anchored, immutable first step, then propagate trust forward one stage at a time.
- FSC-2: Treat boot-time verification and post-boot runtime verification as two distinct, complementary concepts rather than a single one-time gate.
- FSC-3: Apply the identical trust chain regardless of whether the system is powering on normally or resuming after reprogramming.

### 1.3 Functional Security Requirements (FSR)
- FSR-1: Each boot stage shall verify the authenticity and integrity of the next stage's image before transferring control to it.
- FSR-2: A verification failure at any boot stage shall be handled per that stage's defined strategy (halt/fallback for secure boot, measured-and-logged for authentic boot) rather than an ad hoc reaction.
- FSR-3: The first verification step in the chain shall execute from immutable, hardware-resident code that cannot be altered by any software update.
- FSR-4: Runtime integrity checks shall re-evaluate code/critical data after boot completes, independent of the boot-time result.
- FSR-5: Activation following reprogramming shall invoke the same verification chain used at ordinary power-on, with no reduced-check shortcut.
- FSR-6: Runtime monitoring shall remain active across power-on, post-reprogramming, and other operational scenarios without a coverage gap.

## 2. System Requirements and System Static Architecture

### 2.1 System entities
- TDA4VM (J721E) ECU boot and runtime security domain
- Reprogramming/update source domain (gateway/tester/cloud)
- Safety manager and vehicle control domain
- Logging and backend forensic domain

### 2.2 Trust boundaries and interfaces
- Boundary A: External update domain to ECU activation boundary (candidate image handoff)
- Boundary B: DMSC immutable BootROM (hardware root of trust) to loaded/mutable firmware chain
- Boundary C: Runtime monitor (application core) to safety response boundary
- Boundary D: Security event export to backend forensic boundary

```mermaid
graph LR
  Upd[Gateway/Tester/Cloud] -->|Image + Metadata| ECU[TDA4VM/J721E ECU]
  ECU --> ROM[DMSC BootROM - immutable]
  ROM --> SYSFW[System Firmware / TIFS on DMSC]
  SYSFW --> SBL[R5F Secondary Bootloader]
  SBL --> APP[A72 HLOS / Application]
  APP --> RT[Runtime Integrity Monitor]
  RT --> SAFE[Safety Manager]
  RT --> LOG[Secure Logging]
```

### 2.3 System Requirements (SYSR)
- SYSR-1: The system shall ensure the update-source domain, ECU boot domain, safety domain, and logging domain each interact with the trust chain only at their defined boundary (A-D), never directly modifying boot-stage verification state.
- SYSR-2: System entities (Safety Manager, Logging domain) shall receive runtime integrity outcomes only through the Runtime Integrity Monitor's defined interface, not by inspecting boot-chain internals directly.
- SYSR-3: The System Static Architecture shall guarantee that the R5F SBL and A72 Application domains cannot be released except through the DMSC System Firmware authentication boundary (Boundary B).
- SYSR-4: Every image crossing Boundary A (release package handoff to the ECU) shall carry, per stage, its signed payload plus that stage's X.509 certificate and RSA-4096 signature, so the DMSC/System-Firmware verification chain (TSR-1, TSR-2) can authenticate the package without any out-of-band trust input.

### 2.4 Release package (PDX) structure - image handoff artifact at Boundary A

> "PDX" here is a project-level release-package convention (the shippable archive handed across
> Boundary A), not a TI-published TDA4VM/TISCI term - called out per this doc's grounding rule.
> The per-stage X.509 certificate/RSA-4096 signature/SHA2-512 hash contents shown below are the
> real TI-documented structure (Ch.6 "Signing binaries for Secure Boot on HS Devices"); only the
> surrounding folder/manifest layout is a packaging convention layered on top of it.

```text
ECU_PDX/
├── 00_BOOTROM/                     (Immutable, inside SoC - no files in PDX, burned in silicon)
├── 01_SYSFW/                       (System Firmware / TIFS)
│   ├── sysfw.bin
│   │   ├── Payload (SYSFW code)
│   │   ├── X.509 Certificate (Public Key SMPK/BMPK, SHA2-512 hash, KEYREV, SWREV,
│   │   │                       load address, optional AES encryption extension)
│   │   └── RSA-4096 Signature
│   └── manifest_sysfw.json
├── 02_SBL_R5F/                     (Secondary bootloader)
│   ├── sbl_r5f.bin (Payload, X.509 cert w/ BMPK, SHA2-512 hash, KEYREV, SWREV, RSA-4096 sig)
│   └── manifest_sbl.json
├── 03_R5F_APPS/
│   ├── r5f_app0.bin, r5f_app1.bin (Payload, X.509 cert w/ OEM key, SHA2-512 hash,
│   │                                KEYREV, SWREV, RSA-4096 sig)
│   └── manifest_r5f.json
├── 04_A72_APPS/
│   ├── bl31.bin (ATF), bl32.bin (OP-TEE), bl33.bin (U-Boot), Image (Linux kernel), dtb
│   └── manifest_a72.json
├── 05_FS/                          (RootFS, optionally encrypted)
│   ├── rootfs.ext4
│   └── manifest_fs.json
├── 06_KEYS/                        (OEM public key material, for release tooling/traceability)
│   ├── smpk_pub.pem, bmpk_pub.pem, oem_app_pub.pem, key_policy.json
├── 07_CERTS/                       (Extracted certificate bundle, for release tooling/traceability)
│   ├── sysfw_cert.pem, sbl_cert.pem, r5f_app_cert.pem, a72_app_cert.pem, cert_chain.pem
├── 08_LOGS/                        (Bench/build-time secure boot logs, not device-consumed)
│   ├── sysfw_boot_log.bin, sbl_boot_log.bin, app_boot_log.bin
└── 09_MANIFEST/
    └── ecu_manifest.json           (Top-level manifest binding all per-stage manifests/versions)
```

- `00_BOOTROM/` is intentionally empty: the DMSC BootROM (TSR-1's root of trust) is immutable
  silicon and is never part of a shippable package.
- `01_SYSFW/` through `04_A72_APPS/` mirror the chain of trust in 2.2/3.2 one folder per stage:
  each `.bin` carries the same X.509-cert-plus-RSA-4096-signature shape verified in turn by
  `TISCI_MSG_PROC_AUTH_BOOT` (TSR-2), with KEYREV/SWREV fields feeding the anti-rollback check
  in TSR-3.
- `06_KEYS/` and `07_CERTS/` are extracted copies for release/signing tooling and audit
  traceability - the DMSC does not read these paths at boot; it only reads the certificate
  embedded inside each stage's own `.bin`.
- `08_LOGS/` holds bench/build-time boot logs (e.g. from signing-lab validation runs), distinct
  from the on-device Secure Logging domain described in `TDA4VM_Secure_Logging_Requirements.md`.
- `09_MANIFEST/ecu_manifest.json` is the release identity: it binds the per-stage manifests,
  digests, and SWREV/KEYREV versions into one traceable package version (SYSR-4).
- The SMPK/BMPK private keys used to sign every `.bin` above never touch the ECU or this package -
  only their public-key hash is factory-burned into eFuse; see
  `TDA4VM_Secure_Storage_Requirements.md` for the eFuse KEK/DKEK/keyring provisioning mechanics
  that share the same eFuse array.

### 2.5 Binary-to-hardware placement and root-of-trust verification mapping

Two distinct relationships exist between each PDX artifact and the hardware, and they must not be
conflated: **copy/load** (the payload is placed into a core's execution memory) versus **verify**
(the certificate/signature is checked against the eFuse-anchored root of trust before that copy is
allowed to run). The eFuse root of trust is never itself overwritten by a PDX binary - it is
factory/OEM-provisioned once and only ever read for comparison.

```mermaid
graph LR
  subgraph PDX["Release package - PDX artifacts"]
    SYSFWBIN["01_SYSFW/sysfw.bin"]
    SBLBIN["02_SBL_R5F/sbl_r5f.bin"]
    R5FBIN["03_R5F_APPS/r5f_app0-1.bin"]
    A72BIN["04_A72_APPS/bl31+bl32+bl33+Image+dtb"]
    FSBIN["05_FS/rootfs.ext4"]
  end

  subgraph RoT["Root of trust anchor - eFuse (DMSC-only read access)"]
    EFUSE["SMPK/BMPK key hash, KEYREV, SWREV"]
  end

  subgraph HW["Destination hardware cores/memory"]
    DMSCMEM["DMSC Cortex-M3 - internal SYSFW/TIFS RAM"]
    R5FSBLMEM["Cortex-R5F SBL core - TCM/SRAM"]
    R5FAPPMEM["Cortex-R5F application cores - TCM/SRAM"]
    A72MEM["Cortex-A72 cores - DDR"]
  end

  SYSFWBIN -->|"copied into, released by BootROM"| DMSCMEM
  SBLBIN -->|"copied into, released via TISCI_MSG_PROC_AUTH_BOOT"| R5FSBLMEM
  R5FBIN -->|"copied into, released via TISCI_MSG_PROC_AUTH_BOOT"| R5FAPPMEM
  A72BIN -->|"copied into, released via TISCI_MSG_PROC_AUTH_BOOT"| A72MEM
  FSBIN -->|"mounted by A72 HLOS after release"| A72MEM

  SYSFWBIN -.->|"cert verified by BootROM against"| EFUSE
  SBLBIN -.->|"cert verified by SYSFW against"| EFUSE
  R5FBIN -.->|"cert verified by SYSFW against"| EFUSE
  A72BIN -.->|"cert verified by SYSFW/SBL against"| EFUSE
```

| PDX artifact | Copied/loaded into (HW destination) | Verified against (root of trust) | Verifying stage |
|---|---|---|---|
| `01_SYSFW/sysfw.bin` | DMSC Cortex-M3 internal RAM | eFuse SMPK/BMPK key hash + KEYREV/SWREV | DMSC BootROM (TSR-1) |
| `02_SBL_R5F/sbl_r5f.bin` | Cortex-R5F SBL core TCM/SRAM | eFuse SMPK/BMPK key hash + KEYREV/SWREV | System Firmware, via `TISCI_MSG_PROC_AUTH_BOOT` (TSR-2) |
| `03_R5F_APPS/r5f_app*.bin` | Cortex-R5F application core(s) TCM/SRAM | eFuse SMPK/BMPK key hash + KEYREV/SWREV | System Firmware, via `TISCI_MSG_PROC_AUTH_BOOT` (TSR-2) |
| `04_A72_APPS/bl31.bin`, `bl32.bin`, `bl33.bin`, `Image`, `dtb` | Cortex-A72 core DDR | eFuse SMPK/BMPK key hash + KEYREV/SWREV | System Firmware/SBL stage, via `TISCI_MSG_PROC_AUTH_BOOT` (TSR-2) |
| `05_FS/rootfs.ext4` | Cortex-A72 DDR (mounted by HLOS) | Not independently signature-checked by the boot chain itself - integrity depends on the already-verified A72 bootloader/kernel that mounts it | n/a (post-boot mount) |

- The eFuse row (`EFUSE`) is only ever a **read/compare** target, never a write target, from any
  PDX binary - it is the one component in this mapping that is not "copied to" (CSR-3, TSR-1).
- Every copy edge in the diagram is gated by the matching dashed verify edge: a payload is placed
  into its destination core's memory only after its certificate has already passed the eFuse
  comparison for that stage - restating TSC-1's chain-of-trust ordering in placement terms.

### 2.6 Signed binary layout - add (build) side vs. verify (HSM/crypto-accelerator) side

> Grounded in TI TISCI Ch.6 "Signing binaries for Secure Boot on HS Devices" and the X.509
> extension OIDs (`1.3.6.1.4.1.294.1.x`). TDA4VM has no separate "HSM chip" - **SA2UL** is the
> hardware crypto accelerator that plays that role, driven by DMSC BootROM/System Firmware.

**Build side (offline signing tool) - example: `sysfw.bin`**

```mermaid
graph LR
  PAY["Raw
Payload"] --> HASH["SHA2-512
Hash"]
  HASH --> IIE["Image Integrity Ext
hash + size"]
  PAY -.->|optional| ENC["AES-256-CBC Encrypt
IV + RandomString"]
  ENC --> EEXT["Encryption Ext"]
  IIE --> CERT["Build
X.509 Certificate"]
  EEXT --> CERT
  SWR["SWREV Ext
anti-rollback"] --> CERT
  LOAD["Load Ext
destAddr, auth_type"] --> CERT
  BOOT["Boot Ext
bootCore, resetVec"] --> CERT
  CERT --> SIGN["RSA-4096 Sign
SMPK or BMPK priv key"]
  SIGN --> OUT["Signed Binary
Certificate then Payload"]
  PAY --> OUT
```

**Verify side (on-target, at every boot stage) - SA2UL does the actual crypto math**

```mermaid
graph LR
  IN["Signed Binary
at Boundary A"] --> PARSE["BootROM/TIFS
X.509 Parser"]
  PARSE --> SIG["SA2UL
RSA-4096 Verify"]
  SIG -->|invalid| HALT1["Halt / Recover"]
  SIG -->|valid| REV["Check SWREV
vs eFuse counter"]
  REV -->|stale| HALT2["Halt / Recover"]
  REV -->|ok| HASHCHK["SA2UL
SHA2-512 Hash Check"]
  HASHCHK -->|mismatch| HALT3["Halt / Recover"]
  HASHCHK -->|match| COPY["Copy Payload
per Load Ext"]
  COPY -->|Encryption Ext present| DEC["SA2UL
AES-256-CBC Decrypt"]
  COPY -->|no encryption| REL["Release Core
Execute"]
  DEC --> REL
```

- Same two diagrams apply to `sbl_r5f.bin`, only the Boot Ext becomes mandatory (it releases the
  next core) and the verifier is System Firmware (via `TISCI_MSG_PROC_AUTH_BOOT`), not the BootROM.
- GP devices skip both diagrams entirely - no X.509 parser exists on GP silicon.

### 2.7 Crypto algorithm detail - hashing, certificate/signature, encryption

| Operation | Algorithm | Key / material | Runs on | Carried in |
|---|---|---|---|---|
| Hash | SHA2-512 (unkeyed) | none | SA2UL SHA engine | Image Integrity ext `shaValue` (64B) |
| Signature | RSASSA-PKCS1-v1_5 (RFC 8017), RSA-4096 | Sign: SMPK/BMPK private key (offline). Verify: SMPK/BMPK public-key hash, from eFuse (KEYREV-selected) | SA2UL PKA (public-key accelerator) | Certificate's own signature field, over `TBSCertificate` |
| Encryption (optional) | AES-256-CBC | 16B IV + 32B random-string trailer (decrypt-success proof), key = active MEK | SA2UL AES engine | Encryption ext `initialVector`, `randomString` |

**Message-level mechanic** - `TISCI_MSG_PROC_AUTH_BOOT` never carries the binary itself, only a
pointer to it:

```mermaid
sequenceDiagram
    participant Host as Host or SBL
    participant Mem as Shared Memory
    participant DMSC as DMSC then SA2UL

    Host->>Mem: Write Certificate then Payload
    Host->>DMSC: TISCI_MSG_PROC_AUTH_BOOT, certificate_address
    DMSC->>Mem: Read and parse Certificate
    DMSC->>DMSC: SA2UL PKA verify, SHA2-512 check, AES decrypt if needed
    alt Verification failed
        DMSC-->>Host: NAK, no reason given, anti-scan
    else Verification passed
        DMSC->>Mem: Copy Payload per Load Ext
        DMSC-->>Host: ACK, image_address, image_size
    end
```

- **HS-FS vs HS-SE nuance**: on HS-FS device type, `TISCI_MSG_PROC_AUTH_BOOT` only performs the
  image integrity (hash) check - the root-of-trust key/signature comparison is skipped. Full
  RSA-4096/PKA signature verification against the eFuse key hash only happens on HS-SE. Don't
  assume every HS device does the full PKA verify - it is HS-SE only.
- **Streaming variant** (`am275x` only): large images too big to verify in one shot use
  `TISCI_MSG_MCELF_PROC_AUTH_BOOT_INIT` (validate the certificate/signature alone) ->
  `..._UPDATE` (feed segments into the running SHA2-512, max 4MB-16B unencrypted or 62KB
  encrypted, must be a multiple of 16B if encrypted) -> `..._FINISH` (compare final hash, run any
  streaming AES-256-CBC decrypt, then configure/release the core).

**Certificate removal** - governed by the Load Ext's `auth_type` byte, not a separate delete step:

| `auth_type` | What happens to the certificate bytes |
|---|---|
| `0` normal | Payload copied to `destAddr`; cert left behind, unused |
| `1` in-place | Cert + payload both stay put |
| `2` in-place variant | Payload shifted down, overwriting the cert's own bytes |

- HSI-4 (see 6.2): the certificate-plus-payload concatenation and the Load-extension `auth_type`
  copy/strip semantics above are the register/API-level contract between hardware (BootROM/DMSC
  parsing and copy-and-hash logic) and software (the signing tool that built the file) - formalized
  as an HSI requirement rather than left as narrative only.

### 2.8 Runtime integrity monitoring detail - what is re-hashed, where the reference lives, trigger model

> FSR-4/TSR-4 establish that runtime re-checking exists, but TI does not publish a named
> "runtime attestation" feature for TDA4VM. This section documents it as an architectural pattern
> built only from already-grounded primitives: the SA2UL SHA2-512 engine (2.7) and the Protected
> NvM partition (`TDA4VM_Secure_Storage_Requirements.md`, TSR-STO-5/HWR-STO-4) reused as
> reference-hash storage - not a separate TI-named mechanism.

```mermaid
graph LR
  BUILD["Build time
Compute golden hash"] --> NVM["Protected NvM
Reference hash, write-once"]
  APP["A72 Application
Code + critical config"] --> REHASH["SA2UL
SHA2-512 rehash"]
  NVM --> CMP["Runtime Monitor
Compare"]
  REHASH --> CMP
  CMP -->|match| OK["Continue
No action"]
  CMP -->|mismatch| VIOL["Report to
Safety Coordinator"]
  VIOL --> LOGX["Secure Logging
Tamper record"]
```

| Trigger | Region covered | Action on mismatch |
|---|---|---|
| Periodic (watchdog-tied interval) | A72 application code segments | Escalate per graded response (warn/degrade/reset), same as 5.3's loop |
| Event (before a safety-critical mode transition) | Calibration/critical config data | Block the transition, escalate to Safety Coordinator |
| First boot after reprogramming | Full application image | Treated as a boot-time check, not this monitor - falls back to TSR-2/TSR-5 |

- Cadence and exact region boundaries are this doc's architectural choice (SWR-2), not a
  TI-mandated value - TI's contribution is the SA2UL hashing primitive and Protected NvM's
  crash-consistent write path, not the monitoring policy itself.
- A runtime mismatch does not re-enter the boot chain by itself: the Runtime Monitor escalates a
  graded response (warn/degrade/reset, per 5.3's loop) to the Safety Coordinator - only an explicit
  reset re-enters DMSC BootROM (TSR-5); this is not an automatic fallback-image swap.

## 3. Technical Security Concept

### 3.1 Technical Security Concept (TSC)
- TSC-1: Each boot stage cryptographically verifies the next stage before it executes (chain of trust).
- TSC-2: Boot failures halt/fall back (secure boot) or are measured and logged for deferred judgment (authentic boot) - the strategy is a deliberate choice, not interchangeable defaults.
- TSC-3: An immutable, hardware-anchored first-stage verifier initiates the entire chain.
- TSC-4: Runtime monitoring re-validates code integrity independent of and after boot-time checks.
- TSC-5: Post-flash activation reuses the same chain-of-trust verification as normal boot, not a shortcut.

### 3.2 Technical Security Requirements (TSR) - corrected against TI TISCI documentation
- TSR-1: The DMSC immutable BootROM authenticates the System Firmware/TIFS image via X.509 certificate (RSA-4K signature, SHA2-512 hash) and halts/recovers on failure.
- TSR-2: System Firmware (TIFS) authenticates the R5F SBL and A72 application images before releasing each core, via `TISCI_MSG_PROC_AUTH_BOOT`.
- TSR-3: The eFuse SWREV monotonic counter is checked as part of certificate validation at every stage of this same chain, not only at flashing time.
- TSR-4: Runtime integrity re-checking is built from SA2UL hashing plus protected NvM reference storage (architectural pattern consistent with TI's documented SA2UL/TISCI crypto services, not a separately named TI feature).
- TSR-5: Reprogramming's post-flash activation reset re-runs the identical DMSC BootROM -> System Firmware/TIFS -> R5F SBL chain - no separate path.
- TSR-6: A boot-time authentication failure (TSR-1/TSR-2/TSR-3) at ordinary power-on shall halt with
  no fallback image at that stage; an automatic image revert exists only on the OTA/reprogramming
  activation path (`TDA4VM_OTA_FOTA_SOTA_Requirements.md` CSR-OTA-4), never as an implicit behavior
  of a normal power-on failure.

## 4. Hardware Requirements and Hardware Static Architecture

### 4.1 Hardware elements (TDA4VM/J721E specific)
- DMSC (Device Management and Security Controller): a dedicated Cortex-M3 core that executes the
  immutable BootROM at power-on and subsequently hosts System Firmware (SYSFW, also referred to
  as TIFS in newer TI SDKs)
- Dual Cortex-A72 (HLOS: Linux/QNX), 6x Cortex-R5F (real-time/safety, incl. secondary bootloader)
- SA2UL: hardware crypto accelerator used for signature verification and hashing, access-controlled
  by firewalls configured through TISCI
- eFuse array: holds the hash of the customer root-of-trust public keys (SMPK/BMPK), plus the
  KEYREV and SWREV monotonic counters used for anti-rollback
- Flash/OSPI/eMMC for bootloader and application images
- JTAG/Sec-AP debug interface, gated by device security configuration (GP / HS-FS / HS-SE) - see
  `TDA4VM_Secure_JTAG_Requirements.md` for the per-type default-open/closed table and unlock flow

```mermaid
graph LR
  DMSC[DMSC Cortex-M3 BootROM/SYSFW] --> EFUSE[eFuse SMPK/BMPK/KEYREV/SWREV]
  DMSC --> SA2UL[SA2UL Crypto Accelerator]
  DMSC --> R5F[Cortex-R5F SBL Cores]
  R5F --> A72[Cortex-A72 HLOS Cores]
  DMSC --> FLASH[Flash/OSPI/eMMC]
  DMSC --> JTAG[JTAG/Sec-AP Debug Interface]
```

### 4.2 Hardware Requirements (HWR)
- HWR-1: DMSC BootROM is the immutable root of trust that starts every boot (CSR-3, TSC-3, TSR-1)
- HWR-2: eFuse-held SMPK/BMPK key hash anchors all signature verification; KEYREV selects which of
  the two customer keys is active (TSR-1, TSR-2)
- HWR-3: eFuse SWREV enforces monotonic anti-rollback policy, checked by System Firmware as part of
  certificate validation (TSR-3)
- HWR-4: SA2UL performs the SHA-2/RSA operations used for both boot-time authentication and runtime
  integrity hashing (TSR-4)

## 5. Software Requirements and Software Static & Dynamic Architecture

### 5.1 Software blocks
- DMSC BootROM (immutable, authenticates System Firmware/TIFS image)
- System Firmware (SYSFW/TIFS) running on DMSC: exposes the TISCI service interface, including
  `TISCI_MSG_PROC_AUTH_BOOT` used to authenticate and release other processor cores
- R5F secondary bootloader (SBL), authenticated and released by System Firmware
- A72 HLOS bootloader/kernel (Linux/QNX), authenticated and released by the R5F SBL stage
- Runtime integrity monitor task (application core)
- Safety coordination interface and secure logging adapter

```mermaid
graph LR
  ROM[DMSC BootROM] --> SYSFW[System Firmware / TIFS]
  SYSFW -->|TISCI_MSG_PROC_AUTH_BOOT| SBL[R5F SBL]
  SBL -->|TISCI_MSG_PROC_AUTH_BOOT| APP[A72 Application Release]
  APP --> MON[Runtime Integrity Monitor]
  MON --> SAFE[Safety Coordinator]
  MON --> LOG[Secure Logging]
```

### 5.2 Software Requirements (SWR)
- SWR-1: Each stage is authenticated before release using an X.509 certificate carrying an
  RSA-4K signature (RSASSA-PKCS1-v1_5) over a SHA2-512 payload hash, verified by System Firmware
  against the eFuse SMPK/BMPK key hash (TSC-1, TSR-1, TSR-2)
- SWR-2: Runtime re-checking is independent of boot-time verification and re-uses SA2UL hashing (TSC-4)
- SWR-3: Post-flash activation reuses the identical DMSC BootROM -> SYSFW -> SBL -> Application
  authentication sequence; there is no separate/shortcut activation path (CSR-5, TSR-5)

### 5.3 Secure boot and runtime integrity sequence

<p align="center">
  <a href="{{ '/assets/diagrams/TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements-sequence.png' | relative_url }}" target="_blank" rel="noopener">
    <img src="{{ '/assets/diagrams/TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements-sequence.png' | relative_url }}" alt="Secure boot and runtime integrity sequence" style="max-width:100%;">
  </a>
</p>
<details markdown="1">
<summary>Mermaid source (for editing/regeneration)</summary>

```mermaid-source
sequenceDiagram
  participant ROM as DMSC BootROM (immutable)
  participant SF as System Firmware / TIFS
  participant SBL as R5F SBL
  participant APP as A72 Application
  participant MON as Runtime Monitor
  participant SAFE as Safety Manager
  participant LOG as Secure Logging

  ROM->>ROM: Verify SYSFW/TIFS X.509 cert (RSA-4K sig, SHA2-512 hash) vs eFuse SMPK/BMPK hash
  alt Certificate invalid or KEYREV mismatch
    ROM->>ROM: Halt - no software released, failure only observable via boot-fail status/error pin
  else Certificate valid
    ROM->>SF: Release System Firmware (DMSC now running)
    SF->>SF: TISCI_MSG_PROC_AUTH_BOOT request for R5F SBL - verify cert + eFuse SWREV
    alt SBL cert invalid or SWREV stale
      SF->>LOG: Log SBL authentication failure (first stage capable of logging)
      SF->>SF: Halt R5F release, remain in failure-safe state
    else SBL cert valid
      SF->>SBL: Release R5F SBL core
      SBL->>SF: TISCI_MSG_PROC_AUTH_BOOT request for A72 application - verify cert + eFuse SWREV
      alt Application cert invalid or SWREV stale
        SF->>LOG: Log application authentication failure
        SF->>SBL: Halt A72 release, remain in known-good SBL-only state
      else Application cert valid
        SF->>APP: Release A72 application core
        APP->>MON: Start runtime integrity monitoring
        loop Periodic/Event-triggered
          MON->>MON: Recompute hash via SA2UL, compare to protected reference
          alt Violation
            MON->>LOG: Log tamper evidence (region, expected vs actual)
            MON->>SAFE: Coordinate graded response (warn/degrade/reset)
          end
        end
      end
    end
  end
```

</details>


### 5.4 Behavioral requirement focus
- No bypass path: BootROM authentication of System Firmware runs on every power-on/reset with no
  disable option on HS-SE devices (CSR-1, CSR-4, CSR-5)
- A BootROM-stage failure cannot be logged through the normal secure logging path since no software
  has been released yet; it is only observable as a boot-fail status/error indication, which is why
  System Firmware becomes the first stage capable of recording an authentication failure (TSC-2)
- Each stage's authentication failure halts release of the next core rather than falling through to
  a partially-initialized state - the chain fails closed, one stage at a time (CSR-1, TSC-1)
- Runtime detection continues after boot completion, independent of the boot-time chain (CSR-2, CSR-6)
- SWREV-based anti-rollback is checked at every stage of the chain, not only at flashing time (TSR-3)
- Boot/authentication failure handling (halt vs. logged/measured continuation) is a deliberate,
  documented policy choice per stage, not an assumed default (TSC-2)
- Authentication-failure and runtime-tamper log entries referenced above use the chained-HMAC
  record format defined in `TDA4VM_Secure_Logging_Requirements.md` (event ID, severity, module ID,
  SA2UL HMAC chain) - this doc defines only *when* a record is emitted, not its on-disk shape

## 6. Hardware-Software Interface (HSI)

### 6.1 HSI elements
- DMSC BootROM-to-eFuse register read interface (SMPK/BMPK hash, KEYREV, SWREV)
- `TISCI_MSG_PROC_AUTH_BOOT` message interface between System Firmware and R5F/A72 core-release control registers
- SA2UL hash/signature register interface used by the boot chain and the runtime integrity monitor
- DMSC BootROM/System Firmware X.509 DER parser and Load-extension copy engine that consumes the
  cert-plus-payload binary layout defined in 2.6 (HS devices only - no such parser exists on GP
  silicon)
- Runtime Integrity Monitor-to-Protected-NvM reference-hash read interface (write-once at
  provisioning, a distinct logical region within the same physical partition described in
  `TDA4VM_Secure_Storage_Requirements.md`)

### 6.2 HSI Requirements (HSI)
- HSI-1: The eFuse SMPK/BMPK/KEYREV/SWREV register interface shall be readable only by DMSC BootROM and System Firmware, never directly mapped into A72/R5F address space.
- HSI-2: The `TISCI_MSG_PROC_AUTH_BOOT` interface shall be the sole software-visible mechanism to request release of the R5F SBL or A72 application core; no other register write shall bring a core out of reset.
- HSI-3: The SA2UL hashing register interface used by the Runtime Integrity Monitor shall report a distinguishable hardware-fault status separate from an integrity-mismatch status, so software can distinguish an accelerator failure from a real tamper detection.
- HSI-4: The BootROM/System Firmware X.509 parser shall treat the Image Integrity extension's `imageSize`/`shaValue` fields as the sole authority for where the payload begins/ends and what hash it must match, and shall treat the Load extension's `auth_type` field as the sole authority for whether/where the payload is copied - no other offset or length shall be inferred from the file itself.
- HSI-5: The Protected NvM partition holding runtime-integrity reference hashes shall be writable only by the build/provisioning flow that computed them, and readable only by the Runtime Integrity Monitor for comparison - no runtime code path may overwrite a reference hash after provisioning.
