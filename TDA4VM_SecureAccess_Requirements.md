# SecureAccess (Diagnostic Authentication and Authorization) — TDA4VM ADAS ECU

## Scope and terminology note

This document defines requirement traceability for protected diagnostic access (for example UDS SecurityAccess and authorization-gated services). "SecureAccess" here means both authentication and fine-grained authorization enforcement.

## 0. Conceptual primer

Diagnostic connectivity is necessary for service and manufacturing, but protected services can alter ECU behavior or software state. SecureAccess therefore must prevent unauthorized invocation, replay, brute-force probing, and stale-session abuse.

## 1. Cybersecurity engineering flow

```mermaid
flowchart LR
  Goal["Goal<br/>Only trusted tools can invoke protected diagnostics"]
  Req["Requirements<br/>Auth + anti-replay + lockout + role policy"]
  FCR["Functional concept<br/>AuthN/AuthZ split + timeout + deny-by-default"]
  TCR["Technical concept<br/>SA2UL-backed crypto + secured key handling"]
  Arch["Architecture<br/>DCM access gate + policy + logging"]

  Goal --> Req --> FCR --> TCR --> Arch
```

## 2. Cybersecurity Goal

Ensure only authenticated and authorized diagnostic entities can execute protected services, and ensure abuse attempts are rate-limited and observable.

## 3. Cybersecurity Requirements (item level)

CSR-SA-1: Protected services shall require successful security access before execution.
CSR-SA-2: Challenge-response shall include freshness/nonce and anti-replay protection.
CSR-SA-3: Failed attempts shall trigger lockout/backoff and audit logging.
CSR-SA-4: Access rights shall be role/session specific.
CSR-SA-5: Elevated access shall expire automatically and require re-authentication.

## 4. Cybersecurity Concept

### 4.1 Functional Cybersecurity Concept & Requirements

FCR-SA-1: Separate authentication (identity proof) from authorization (service scope).
FCR-SA-2: Enforce deny-by-default for protected services when access state is invalid.
FCR-SA-3: Invalidate access state on timeout, reset, and session downgrade.
FCR-SA-4: Apply graded delay/lockout policy for brute-force resistance.

### 4.2 Technical Cybersecurity Concept & Requirements (TDA4VM-oriented)

TCR-SA-1: Implement challenge-response using hardware-assisted crypto (SA2UL where applicable).
TCR-SA-2: Keep long-term secrets in secure storage/provisioning flow and prevent plaintext export.
TCR-SA-3: Bind decisions to lifecycle state and policy configuration.
TCR-SA-4: Emit security events to protected logging path for forensic continuity.

## 5. System Cybersecurity Architecture

```mermaid
flowchart LR
  Tester["Diagnostic tester"]
  Gateway["Vehicle gateway"]
  DCM["DCM + SecurityAccess handler"]
  Policy["Authorization policy"]
  Crypto["SA2UL/Crypto service"]
  Log["Secure logging"]

  Tester --> Gateway --> DCM
  DCM --> Crypto
  DCM --> Policy
  DCM --> Log
```

## 6. SW Requirements & HW Requirements (allocated)

### 6.1 Software requirements

SWR-SA-1: DCM shall gate RequestDownload, RoutineControl, and protected WriteData services by access level.
SWR-SA-2: SecurityAccess state machine shall enforce timeout, retry counters, and lockout windows.
SWR-SA-3: Service handlers shall validate access token/state at each protected request.
SWR-SA-4: Security failures shall be logged and exposed to diagnostics monitoring.

### 6.2 Hardware requirements

HWR-SA-1: Crypto hardware support shall meet authentication timing constraints.
HWR-SA-2: Hardware-backed key protection primitives shall be available for credential handling.

## 7. Software Architecture

```mermaid
sequenceDiagram
  participant T as Tester
  participant D as DCM
  participant C as Crypto/SA2UL
  participant P as Policy
  participant L as Secure Log

  T->>D: Request seed/challenge
  D->>C: Generate challenge material
  D-->>T: Challenge
  T->>D: Response/key material
  D->>C: Verify response
  C-->>D: Verification result
  D->>P: Resolve authorization level
  alt Valid
    D-->>T: Access granted
    D->>L: Log success
  else Invalid
    D-->>T: Access denied/delay
    D->>L: Log failure + attempt count
  end
```

## 8. Hardware Architecture and scenarios

### 8.1 Hardware dynamic sequence diagram

```mermaid
sequenceDiagram
  participant Tester as Diagnostic tester
  participant DCM as DCM/SecurityAccess
  participant SA2UL as SA2UL/Crypto
  participant Policy as Authorization policy
  participant Log as Secure log

  alt Scenario A - Default session
    Tester->>DCM: Protected service request without access
    DCM->>Policy: Check access state
    Policy-->>DCM: Deny
  else Scenario B - Authenticated session
    Tester->>DCM: Challenge-response exchange
    DCM->>SA2UL: Verify response
    SA2UL-->>DCM: Valid
    DCM->>Policy: Grant scoped access level
  else Scenario C - Probing/brute-force attempts
    Tester->>DCM: Repeated invalid responses
    DCM->>Policy: Increment failure counter
    Policy-->>DCM: Enforce delay/lockout
    DCM->>Log: Record attack pattern
  end
```

- Scenario A: Normal diagnostics in default session with protected services denied.
- Scenario B: Authenticated service session with bounded privileges and expiry.
- Scenario C: Attack/probing attempts with delay escalation and lockout.

## 9. Verification focus

- Replay test: Reused response must fail.
- Privilege test: Protected service call without valid state must be rejected.
- Abuse test: Repeated failures must enforce delay/lockout and log evidence.
