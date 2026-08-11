# Secure Communication — TDA4VM ADAS ECU

## Scope and terminology note

This document defines requirement traceability for protected communication on a TDA4VM-based ADAS ECU across in-vehicle and off-board links.

## 0. Conceptual primer

Communication protection is not one mechanism for all links. In-vehicle control traffic and IP/off-board traffic often require different protocol profiles, but both require authentication, integrity, freshness, and policy-driven key lifecycle.

## 1. Cybersecurity engineering flow

```mermaid
flowchart LR
  Goal["Goal<br/>Resilient protected communication without unsafe performance impact"]
  Req["Requirements<br/>Auth + integrity + freshness + confidentiality"]
  FCR["Functional concept<br/>Profile-by-channel + centralized key lifecycle"]
  TCR["Technical concept<br/>SA2UL workloads + freshness sync + policy manager"]
  Arch["Architecture<br/>Com stack security gate + key manager + logging"]

  Goal --> Req --> FCR --> TCR --> Arch
```

## 2. Cybersecurity Goal

Protect communication channels against spoofing, tampering, replay, and unauthorized disclosure while maintaining required timing for ADAS operation.

## 3. Cybersecurity Requirements (item level)

CSR-COM-1: Critical messages shall include source authentication and integrity protection.
CSR-COM-2: Sensitive payloads shall use confidentiality-protected channels.
CSR-COM-3: Freshness/anti-replay checks shall be enforced on protected flows.
CSR-COM-4: Invalid security metadata shall result in fail-closed behavior for critical paths.
CSR-COM-5: Key lifecycle controls shall support rotation/revocation without policy gaps.

## 4. Cybersecurity Concept

### 4.1 Functional Cybersecurity Concept & Requirements

FCR-COM-1: Apply protocol-appropriate protection profile per channel.
FCR-COM-2: Enforce receiver-side verification before handing data to application logic.
FCR-COM-3: Centralize key provisioning, rotation, and revocation policy.
FCR-COM-4: Provide security violation telemetry for operations and forensics.

### 4.2 Technical Cybersecurity Concept & Requirements (TDA4VM-oriented)

TCR-COM-1: Use SA2UL-assisted crypto for MAC/signature/encryption operations.
TCR-COM-2: Bind trust decisions to lifecycle state and key state policy.
TCR-COM-3: Implement synchronized freshness counters/nonces across peers.
TCR-COM-4: Integrate drop/deny outcomes with secure logging.

## 5. System Cybersecurity Architecture

```mermaid
flowchart LR
  Tx["Sender ECU/endpoint"]
  Stack["Protected comm stack"]
  Key["Key/policy manager"]
  Crypto["SA2UL/Crypto"]
  Rx["Receiver app"]
  Log["Secure logging"]

  Tx --> Stack --> Crypto --> Stack --> Rx
  Key --> Stack
  Stack --> Log
```

## 6. SW Requirements & HW Requirements (allocated)

### 6.1 Software requirements

SWR-COM-1: Receiver stack shall reject messages with invalid MAC/signature/freshness.
SWR-COM-2: Key state transitions shall be coordinated with policy and session management.
SWR-COM-3: Security violations shall generate auditable events.
SWR-COM-4: Protection configuration shall be deterministic per communication channel class.

### 6.2 Hardware requirements

HWR-COM-1: Crypto hardware path shall meet throughput/latency targets for enabled protections.
HWR-COM-2: Hardware key-protection primitives shall support protected key handling.

## 7. Software Architecture

```mermaid
sequenceDiagram
  participant S as Sender
  participant TX as TX security stack
  participant RX as RX security stack
  participant C as Crypto
  participant A as Application

  S->>TX: Payload
  TX->>C: Compute MAC/encrypt + freshness
  TX-->>RX: Protected frame
  RX->>C: Verify MAC/decrypt/freshness
  alt Valid
    RX->>A: Deliver payload
  else Invalid
    RX->>RX: Drop frame + log event
  end
```

## 8. Hardware Architecture and scenarios

### 8.1 Hardware dynamic sequence diagram

```mermaid
sequenceDiagram
  participant Tx as Sender endpoint
  participant Rx as Receiver security stack
  participant SA2UL as SA2UL/Crypto
  participant Key as Key policy manager
  participant Log as Secure log

  alt Scenario A - Normal protected traffic
    Tx->>Rx: Protected frame
    Rx->>SA2UL: Verify MAC/signature and freshness
    SA2UL-->>Rx: Valid
  else Scenario B - Spoof/tamper attempt
    Tx->>Rx: Forged or modified frame
    Rx->>SA2UL: Verify authenticity/integrity
    SA2UL-->>Rx: Invalid
    Rx->>Log: Record drop event
  else Scenario C - Replay attempt
    Tx->>Rx: Stale frame with old freshness value
    Rx->>Key: Check freshness window/counter
    Key-->>Rx: Out-of-window
    Rx->>Log: Record replay detection
  end
```

- Scenario A: Normal protected flow; valid authenticated frames delivered.
- Scenario B: Spoof/tamper frame; rejected before application delivery.
- Scenario C: Replay of stale frame; freshness logic rejects and logs event.

## 9. Verification focus

- Spoofing test: Forged sender identity must be rejected.
- Replay test: Old valid frame must fail freshness check.
- Performance test: Security-enabled channels must meet timing constraints.
