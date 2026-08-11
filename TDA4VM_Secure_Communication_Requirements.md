---
layout: default
title: Secure Communication
nav_title: Secure Comm
---

# Secure Communication Architecture Requirements - TDA4VM ADAS ECU

This doc covers confidentiality-protected channels, shared key/policy management, and off-board
(cloud/backend) sessions. Per-PDU in-vehicle authenticity/freshness protection (the AUTOSAR SecOC
authentication pattern) is covered by its own dedicated doc,
[TDA4VM_SecOC_Requirements.md](TDA4VM_SecOC_Requirements.md).

## 1. Functional Security Concept

### 1.1 Cybersecurity Requirements (CSR)
- CSR-COM-1: Critical messages shall include source authentication and integrity protection.
- CSR-COM-2: Sensitive payloads shall use confidentiality-protected channels.
- CSR-COM-3: Freshness/anti-replay checks shall be enforced on protected flows.
- CSR-COM-4: Invalid security metadata shall result in fail-closed behavior for critical paths.
- CSR-COM-5: Key lifecycle controls shall support rotation/revocation without policy gaps.

### 1.2 Functional Security Concept (FSC)
- FSC-COM-1: Protect messages using a combination tailored to their exposure - authenticity/integrity for control-relevant traffic, confidentiality additionally for sensitive payloads.
- FSC-COM-2: Treat freshness/replay protection as mandatory alongside authenticity, since a valid-but-replayed message is still an attack.
- FSC-COM-3: Fail closed on any security-metadata anomaly for critical flows rather than degrading silently to unauthenticated behavior.

### 1.3 Functional Security Requirements (FSR)
- FSR-COM-1: A critical message shall be rejected by the receiver if its source cannot be authenticated or its integrity cannot be verified.
- FSR-COM-2: A sensitive payload shall only be transmitted over a channel providing confidentiality protection appropriate to its classification.
- FSR-COM-3: Each protected message shall carry a freshness indicator checked independently of its authenticity tag, and stale or reused values shall be rejected.
- FSR-COM-4: Invalid or missing security metadata on a critical flow shall result in the message being discarded, never processed with reduced trust.
- FSR-COM-5: Key rotation or revocation shall take effect without a window in which both old and new keys are simultaneously accepted beyond a defined transition policy.

## 2. System Requirements and System Static Architecture

### 2.1 System entities
- Sender ECU/endpoint
- Receiver ECU/application endpoint
- Vehicle gateway/network backbone
- Off-board cloud/service endpoint
- Key and policy management authority

### 2.2 Trust boundaries and interfaces
- Boundary A: Sender trust domain to network transport domain
- Boundary B: Network domain to receiver verification domain
- Boundary C: ECU to key-management/policy domain
- Boundary D: Security event export to logging/operations backend

```mermaid
graph LR
  Tx[Sender ECU] --> Net[Vehicle Network/Gateway]
  Net --> Rx[Receiver ECU]
  Key[Key/Policy Manager] --> Tx
  Key --> Rx
  Rx --> Log[Secure Logging]
  Log --> Ops[Operations Backend]
```

### 2.3 System Requirements (SYSR)
- SYSR-COM-1: Sender and Receiver ECU domains shall exchange protected messages only through the Key/Session Manager boundary (Boundary C), never applying protection ad hoc per message. In-vehicle PDU authenticity/freshness protection itself is realized by the dedicated SecOC module (see TDA4VM_SecOC_Requirements.md), which consumes the same key state via this boundary.
- SYSR-COM-2: The Key/Policy Manager shall be the single system-wide source of active keys and freshness policy consumed identically by TX and RX security stacks.
- SYSR-COM-3: Security violation telemetry crossing Boundary D shall preserve PDU ID and channel-class context for cross-ECU correlation.

## 3. Technical Security Concept

### 3.1 Technical Security Concept (TSC)
- TSC-COM-1: Apply protocol-appropriate protection profile per channel.
- TSC-COM-2: Enforce receiver-side verification before handing data to application logic.
- TSC-COM-3: Centralize key provisioning, rotation, and revocation policy.
- TSC-COM-4: Provide security violation telemetry for operations and forensics.

### 3.2 Technical Security Requirements (TSR)
- TSR-COM-1: Use SA2UL-assisted AES-GCM encryption for confidentiality-protected payloads; in-vehicle PDU authenticity/freshness MAC protection itself is realized by the dedicated SecOC module (see TDA4VM_SecOC_Requirements.md).
- TSR-COM-2: Bind trust decisions to lifecycle state and key state policy.
- TSR-COM-3: Synchronize session nonces/IVs for confidentiality channels and off-board TLS/mTLS sessions across peers.
- TSR-COM-4: Integrate drop/deny outcomes with secure logging.

## 4. Hardware Requirements and Hardware Static Architecture

### 4.1 Hardware elements
- TDA4VM (J721E) communication and control domains: Cortex-A72/R5F application cores, DMSC (System Firmware/TIFS)
- SA2UL crypto accelerator for confidentiality encryption/decryption (AES-GCM)
- eFuse-anchored key material handled via System Firmware provisioning services
- CAN/Ethernet and related communication peripherals
- DMSC BootROM/device security type constrains which trust policy is enforceable

```mermaid
graph LR
  APP[A72/R5F Application Core] --> SA2UL[SA2UL Crypto Accelerator]
  APP --> NET[CAN/Ethernet Peripheral]
  SA2UL --> DMSC[DMSC Cortex-M3 SYSFW]
  DMSC --> EFUSE[eFuse Key Provisioning Store]
  DMSC --> SECTYPE[Device Security Type Policy]
```

### 4.2 Hardware Requirements (HWR)
- HWR-COM-1: Throughput/latency supports enabled protections
- HWR-COM-2: Key material handling uses protected hardware path
- HWR-COM-3: SA2UL provides the hardware crypto path for confidentiality encryption/decryption operations (TSR-COM-1)

## 5. Software Requirements and Software Static & Dynamic Architecture

### 5.1 Software blocks
- TX confidentiality wrapper (AES-GCM encryption for sensitive payloads)
- RX confidentiality verifier (AES-GCM decryption/tag check)
- Off-board TLS/mTLS session manager
- Key and session state manager
- Communication policy engine (routes control-relevant PDUs to the SecOC module, sensitive payloads to the confidentiality wrapper)
- Secure logging connector

```mermaid
graph LR
  APP[Application] --> POL[Communication Policy Engine]
  POL --> SECOC[SecOC Module - see SecOC doc]
  POL --> TXS[TX Confidentiality Stack]
  TXS --> NET[Com Stack]
  NET --> RXS[RX Confidentiality Stack]
  RXS --> APP
  KEY[Key/Session Manager] --> TXS
  KEY --> RXS
  KEY --> SECOC
  RXS --> LOG[Secure Logging]
```

### 5.2 Software Requirements (SWR)
- SWR-COM-1: Reject invalid confidentiality-channel authentication tag (e.g. AES-GCM tag mismatch) or TLS/mTLS session validation failure
- SWR-COM-2: Coordinate key transitions with sessions/policy
- SWR-COM-3: Emit auditable security violations
- SWR-COM-4: Deterministic channel-class protection configuration, including routing control-relevant PDUs to the SecOC module rather than the confidentiality wrapper

### 5.3 Confidentiality-protected channel and off-board TLS session establishment flow

In-vehicle PDU authenticity/freshness verification (SecOC) has its own dedicated sequence diagram
in [TDA4VM_SecOC_Requirements.md](TDA4VM_SecOC_Requirements.md#53-secoc-protected-authentic-pdu-authentication-and-freshness-verification-flow).

```mermaid
sequenceDiagram
  participant App as Sender Application
  participant Tx as TX Confidentiality Stack
  participant Y as SA2UL AES-GCM
  participant Bus as CAN-FD/Ethernet
  participant Rx as RX Confidentiality Stack
  participant AppR as Receiver Application
  participant L as Secure Logging
  participant OB as Off-board TLS Session

  App->>Tx: Sensitive payload for confidentiality-classified channel
  Tx->>Y: Encrypt payload with session key, AES-GCM
  Y-->>Tx: Ciphertext plus authentication tag
  Tx->>Bus: Confidentiality-protected frame
  Bus->>Rx: Deliver frame
  Rx->>Y: Decrypt and verify authentication tag
  alt Tag verification failure
    Rx->>L: Drop, confidentiality-channel authentication failure
  else Tag verification success
    Rx->>AppR: Deliver decrypted payload
  end

  Note over OB: Independent off-board path
  OB->>OB: TLS 1.2+/mTLS session using eFuse-anchored device X.509 identity
  OB->>L: Session establishment/failure logged separately from in-vehicle path
```

### 5.4 Behavioral requirement focus
- Sensitive payloads are protected with SA2UL-assisted AES-GCM confidentiality encryption, and a tag verification failure is fail-closed before reaching the receiver application (CSR-COM-2, TSR-COM-1, SWR-COM-1)
- Off-board (cloud/backend) sessions use a separate TLS/mTLS trust path anchored to the device's eFuse-derived identity, independent from the in-vehicle bus-level scheme (CSR-COM-2, TSR-COM-2)
- Control-relevant traffic requiring per-PDU authenticity/freshness is routed by the Communication Policy Engine to the dedicated SecOC module rather than the confidentiality wrapper (CSR-COM-1, CSR-COM-3, SWR-COM-4, see TDA4VM_SecOC_Requirements.md)
- Repeated verification failures on either the confidentiality channel or the SecOC path are correlated across the RTMD/logging boundary for escalation, not treated as isolated drops (CSR-COM-5, TSR-COM-4)

## 6. Hardware-Software Interface (HSI)

### 6.1 HSI elements
- SA2UL AES-GCM encryption/decryption register interface
- TLS/mTLS session key and certificate interface for off-board sessions
- CAN-FD/Ethernet peripheral DMA-to-security-stack interface

### 6.2 HSI Requirements (HSI)
- HSI-COM-1: The SA2UL encrypt/decrypt interface shall accept only pre-validated key handles from the Key/Session Manager, never raw key bytes passed directly from the communication stack.
- HSI-COM-2: The TLS/mTLS session interface shall present the device's eFuse-anchored X.509 identity without exposing the underlying private key to application memory.
- HSI-COM-3: The peripheral DMA interface delivering frames to the RX confidentiality stack shall not release payload to the application-facing buffer until the SA2UL verification interface returns a pass status.
