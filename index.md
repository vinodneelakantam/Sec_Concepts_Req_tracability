---
layout: default
title: Home
nav_title: Home
---

# TDA4VM ADAS ECU Cybersecurity Requirements

This site is a collection of automotive cybersecurity requirements documents and TARA
(Threat Analysis and Risk Assessment) dashboards, organized per ECU. It exists as a learning
and interview-preparation resource for grounding automotive cybersecurity concepts in real
hardware/firmware facts (TI TISCI mailbox APIs, DMSC, SA2UL, TIFS, eFuse/OTP, etc.) rather
than generic textbook descriptions, while following established standards vocabulary
(ISO 21434, ISO 14229 UDS, AUTOSAR SecOC).

## Choose an ECU

<div class="ecu-cards">
  <a class="ecu-card" href="{{ '/Parking/' | relative_url }}">
    <h2>PARKING</h2>
    <p>ADAS Parking Assist / Surround View System (SVS) ECU</p>
    <p>Requirements documents, TARA dashboard, and vulnerability analysis report</p>
  </a>
  <a class="ecu-card ecu-card-tbd" href="{{ '/SDV/' | relative_url }}">
    <h2>SDV</h2>
    <p>Software Defined Vehicle platform</p>
    <span class="badge-tbd">TBD</span>
  </a>
</div>

<style>
  .ecu-cards { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 1.5rem 0; }
  .ecu-card {
    display: block;
    width: 260px;
    padding: 1.5rem 1.25rem;
    border: 2px solid #1a365d;
    border-radius: 8px;
    text-align: center;
    text-decoration: none;
    color: inherit;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .ecu-card:hover { transform: translateY(-4px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
  .ecu-card h2 { margin: 0 0 0.5rem; color: #1a365d; }
  .ecu-card p { margin: 0.2rem 0; font-size: 0.85rem; color: #57606a; }
  .ecu-card-tbd { border-color: #999; opacity: 0.85; }
  .ecu-card-tbd h2 { color: #666; }
  .badge-tbd {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.1rem 0.7rem;
    background: #e0e0e0;
    color: #555;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
</style>

## Requirement ID taxonomy

TARA (Threat Analysis and Risk Assessment - see each ECU's TARA dashboard) is what supplies the
CSG: every Cybersecurity Goal comes from a TARA risk-treatment decision, and each subsequent ID in
the chain below is derived from the one before it, in order:

```mermaid
graph LR
    TARA["TARA (Threat Analysis and Risk Assessment)"] --> CSG["CSG (Cybersecurity Goal)"]
    CSG --> FSC["FSC (Functional Security Concept)"]
    FSC --> FSR["FSR (Functional Security Requirements)"]
    FSR --> SYSR["SYSR (System Requirement)"]
    SYSR --> TSC["TSC (Technical Security Concept)"]
    TSC --> TSR["TSR (Technical Security Requirements)"]
    TSR --> HWR["HWR (Hardware Requirement)"]
    TSR --> SWR["SWR (Software Requirement)"]
    HWR --> HSI["HSI (Hardware-Software Interface)"]
    SWR --> HSI
```

- **CSG** - Cybersecurity Goal (what must be true)
- **FSC** - Functional Security Concept (the overarching strategy for realizing the CSGs)
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
