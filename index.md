---
layout: default
title: Home
nav_title: Home
---

# TDA4VM ADAS ECU Cybersecurity Requirements

This site is a collection of automotive cybersecurity requirements documents for a
TDA4VM (TI Jacinto 7 / J721E) ADAS ECU. It exists as a learning and interview-preparation
resource for grounding automotive cybersecurity concepts in real hardware/firmware facts
(TI TISCI mailbox APIs, DMSC, SA2UL, TIFS, eFuse/OTP, etc.) rather than generic textbook
descriptions, while following established standards vocabulary (ISO 21434, ISO 14229 UDS,
AUTOSAR SecOC).

Each document follows the same flow: **FSC (→FSR) → System Requirements + System Static
Architecture → TSC (→TSR) → Hardware Requirements + Hardware Static Architecture → Software
Requirements + Software Static & Dynamic Architecture → HSI**, using a consistent
CSR/FSC/FSR/SYSR/TSC/TSR/HWR/SWR/HSI requirement ID taxonomy.

## Topics

| Document | Topic |
|---|---|
| [Secure and Authentic Boot with Runtime Integrity]({{ "/TDA4VM_Secure_Authentic_Boot_Runtime_Integrity_Requirements.html" | relative_url }}) | Secure/authentic boot and runtime integrity |
| [Secure JTAG and Debug Control]({{ "/TDA4VM_Secure_JTAG_Requirements.html" | relative_url }}) | JTAG/debug port access control |
| [Secure Access]({{ "/TDA4VM_SecureAccess_Requirements.html" | relative_url }}) | UDS SecurityAccess (diagnostic access control) |
| [SecOC]({{ "/TDA4VM_SecOC_Requirements.html" | relative_url }}) | Secure communication stack: AUTOSAR SecOC per-PDU authenticity/freshness, confidentiality channels, off-board TLS |
| [Secure Logging]({{ "/TDA4VM_Secure_Logging_Requirements.html" | relative_url }}) | Secure/tamper-evident logging |
| [OTA/FOTA/SOTA]({{ "/TDA4VM_OTA_FOTA_SOTA_Requirements.html" | relative_url }}) | OTA/FOTA/SOTA update delivery |
| [Secure Reprogramming]({{ "/TDA4VM_Secure_Reprogramming_Requirements.html" | relative_url }}) | Secure ECU reprogramming |
| [RTMD]({{ "/TDA4VM_RTMD_Requirements.html" | relative_url }}) | Runtime tamper monitoring and detection |
| [Secure Storage]({{ "/TDA4VM_Secure_Storage_Requirements.html" | relative_url }}) | Secure storage of keys/credentials at rest |

## Vulnerability analysis: process vs. deliverable

These two documents are deliberately kept separate and live together under `Vulnerability_Analysis/`:

| Document | What it is |
|---|---|
| [Vulnerability Management Process]({{ "/Vulnerability_Analysis/TDA4VM_Vulnerability_Analysis_Requirements.html" | relative_url }}) | **Requirements doc.** Defines the ongoing ISO 21434 continuous-cybersecurity-activity capability (SBOM/CVE monitoring, TARA re-assessment, risk-treatment routing) using this repo's CSR/FSR/SYSR/TSC/TSR taxonomy. Says a capability must exist - contains no analysis of a specific subsystem. |
| [SVS / Parking Assist Vulnerability Analysis Report]({{ "/Vulnerability_Analysis/SVS_ParkingAssist_Vulnerability_Analysis_Report.html" | relative_url }}) | **Point-in-time report.** One concrete engagement deliverable produced *by* that process for the SVS/Parking Assist subsystem: attack surfaces, STRIDE, CVSS-scored risk matrix, case-study narratives, and evidence appendices (CAN/UDS logs, pen-test findings, static/dynamic/fuzz results). |

## Requirement ID taxonomy

- **CSR** - Cybersecurity Requirement (what must be true)
- **FSC** - Functional Security Concept (the overarching strategy for realizing the CSRs)
- **FSR** - Functional Security Requirements (decomposed, testable, still implementation-agnostic)
- **SYSR** - System Requirement (system-level allocation across entities/trust boundaries)
- **TSC** - Technical Security Concept (how, at a functional level)
- **TSR** - Technical Security Requirements (how, at a concrete TI TDA4VM mechanism level)
- **HWR** - Hardware Requirement
- **SWR** - Software Requirement
- **HSI** - Hardware-Software Interface Requirement (register/API/message contract)

## Intended use

This is not a product specification for a real vehicle program - it's a self-contained
knowledge base for studying automotive cybersecurity engineering (requirements writing,
TARA-based rationale, and TI TDA4VM-specific security mechanisms) in a realistic, traceable
format. See the [README on GitHub](https://github.com/vinodneelakantam/Sec_Concepts_Req_tracability#readme)
for the full repo/tooling overview.
