# TDA4VM ADAS ECU Cybersecurity Requirements

This repository is a collection of automotive cybersecurity requirements documents for a
TDA4VM (TI Jacinto 7 / J721E) ADAS ECU. It exists as a learning and interview-preparation
resource for grounding automotive cybersecurity concepts in real hardware/firmware facts
(TI TISCI mailbox APIs, DMSC, SA2UL, TIFS, eFuse/OTP, etc.) rather than generic textbook
descriptions, while following established standards vocabulary (ISO 21434, ISO 14229 UDS,
AUTOSAR SecOC).

## What's in here

Each `TDA4VM_*_Requirements.md` file covers one security concept end-to-end, following the flow
**FSC (→FSR) → System Requirements + System Static Architecture → TSC (→TSR) → Hardware
Requirements + Hardware Static Architecture → Software Requirements + Software Static & Dynamic
Architecture → HSI**, structured as six sections:

1. **Functional Security Concept** - the CSR, the overarching FSC strategy, and the decomposed FSR.
2. **System Requirements and System Static Architecture** - entities, trust boundaries, a Mermaid
   diagram, and the system-level requirement allocation (`SYSR-*`).
3. **Technical Security Concept** - the TSC (how, functionally) and TSR (how, at a concrete TI
   TDA4VM mechanism level).
4. **Hardware Requirements and Hardware Static Architecture** - the HW blocks/registers involved
   (`HWR-*`).
5. **Software Requirements and Software Static & Dynamic Architecture** - software blocks, `SWR-*`
   requirements, and sequence diagrams for the security-relevant flows.
6. **Hardware-Software Interface (HSI)** - the register/API/message-level contract between the
   hardware and software layers (`HSI-*`).

Requirements are layered per topic using a consistent ID taxonomy:

- **CSR** - Cybersecurity Requirement (what must be true)
- **FSC** - Functional Security Concept (the overarching strategy for realizing the CSRs)
- **FSR** - Functional Security Requirements (decomposed, testable, still implementation-agnostic)
- **SYSR** - System Requirement (system-level allocation across entities/trust boundaries)
- **TSC** - Technical Security Concept (how, at a functional level)
- **TSR** - Technical Security Requirements (how, at a concrete TI TDA4VM mechanism level)
- **HWR** - Hardware Requirement
- **SWR** - Software Requirement
- **HSI** - Hardware-Software Interface Requirement (register/API/message contract)

Topics currently covered:

| Document | Topic |
|---|---|
| [TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements.md](TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements.md) | Secure/authentic boot and runtime integrity |
| [TDA4VM_Secure_JTAG_Requirements.md](TDA4VM_Secure_JTAG_Requirements.md) | JTAG/debug port access control |
| [TDA4VM_SecureAccess_Requirements.md](TDA4VM_SecureAccess_Requirements.md) | UDS SecurityAccess (diagnostic access control) |
| [TDA4VM_Secure_Communication_Requirements.md](TDA4VM_Secure_Communication_Requirements.md) | Secure in-vehicle communication (SecOC) |
| [TDA4VM_Secure_Logging_Requirements.md](TDA4VM_Secure_Logging_Requirements.md) | Secure/tamper-evident logging |
| [TDA4VM_OTA_FOTA_SOTA_Requirements.md](TDA4VM_OTA_FOTA_SOTA_Requirements.md) | OTA/FOTA/SOTA update delivery |
| [TDA4VM_Secure_Reprogramming_Requirements.md](TDA4VM_Secure_Reprogramming_Requirements.md) | Secure ECU reprogramming |
| [TDA4VM_RTMD_Requirements.md](TDA4VM_RTMD_Requirements.md) | Runtime tamper monitoring and detection |
| [TDA4VM_Secure_Storage_Requirements.md](TDA4VM_Secure_Storage_Requirements.md) | Secure storage of keys/credentials at rest |

A `.docx` copy of the boot/runtime-integrity doc is also kept for reference.

## Repo tooling

The [.github/skills](.github/skills) folder contains Copilot skill files that encode the
domain knowledge and workflows used to write and maintain these documents:

- `automotive-cybersecurity-requirements` - grounded TI TDA4VM/TISCI facts, the requirement
  taxonomy, doc structure convention, and Mermaid authoring/validation rules.
- `requirements-doc-scaffolding` - procedure for adding a brand-new topic document.
- `requirements-review` - audit checklist for structure, ID taxonomy, and grounding quality.
- `traceability-matrix` - builds a cross-document CSR/FSC/FSR/SYSR/TSC/TSR/SWR/HWR/HSI
  traceability matrix.
- `iso21434-tara-grounding` - ISO 21434 TARA vocabulary to justify why a given CSR exists.
- `interview-qa-generator` - generates practice interview Q&A grounded in these documents.

## Intended use

This is not a product specification for a real vehicle program - it's a self-contained
knowledge base for studying automotive cybersecurity engineering (requirements writing,
TARA-based rationale, and TI TDA4VM-specific security mechanisms) in a realistic, traceable
format.
