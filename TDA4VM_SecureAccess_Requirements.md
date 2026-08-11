# Secure Access (Diagnostics and Protected Services) Architecture Requirements - TDA4VM ADAS ECU

## 1. System Static Architecture

### 1.1 System entities
- Authorized tester/service tool
- Vehicle gateway
- Target ECU diagnostics endpoint (DCM)
- Security policy authority/provisioning backend
- Fleet operations backend for audit telemetry

### 1.2 Trust boundaries and interfaces
- Boundary A: Tester to gateway/ECU diagnostic interface
- Boundary B: DCM service layer to protected ECU services
- Boundary C: Access-state management to session manager boundary
- Boundary D: ECU logging path to backend audit domain

```mermaid
graph LR
  Tester[Tester Tool] -->|UDS/Diag| GW[Gateway]
  GW --> DCM[DCM/SecurityAccess]
  DCM --> SRV[Protected Services]
  DCM --> LOG[Secure Logging]
  LOG --> Backend[Ops Backend]
```

### 1.3 System-level requirement allocation

**Cybersecurity Requirements (CSR)**
- CSR-SA-1: Protected services shall require successful security access before execution.
- CSR-SA-2: Challenge-response shall include freshness/nonce and anti-replay protection.
- CSR-SA-3: Failed attempts shall trigger lockout/backoff and audit logging.
- CSR-SA-4: Access rights shall be role/session specific.
- CSR-SA-5: Elevated access shall expire automatically and require re-authentication.

**Functional Cybersecurity Concept (FCR)**
- FCR-SA-1: Separate authentication (identity proof) from authorization (service scope).
- FCR-SA-2: Enforce deny-by-default for protected services when access state is invalid.
- FCR-SA-3: Invalidate access state on timeout, reset, and session downgrade.
- FCR-SA-4: Apply graded delay/lockout policy for brute-force resistance.

**Technical Cybersecurity Concept (TCR)**
- TCR-SA-1: Implement challenge-response using hardware-assisted crypto (SA2UL where applicable).
- TCR-SA-2: Keep long-term secrets in secure storage/provisioning flow and prevent plaintext export.
- TCR-SA-3: Bind decisions to lifecycle state and policy configuration.
- TCR-SA-4: Emit security events to protected logging path for forensic continuity.

## 2. Hardware Static Architecture

### 2.1 Hardware elements
- TDA4VM (J721E) processing domain: Cortex-A72/R5F application cores plus DMSC (System Firmware/TIFS)
- SA2UL crypto acceleration support for challenge-response operations
- eFuse-anchored key storage (SMPK/BMPK) via System Firmware provisioning services
- DMSC BootROM + device security type (GP/HS-FS/HS-SE) constrain which access levels are possible
- JTAG/Sec-AP debug state controls affecting access policy (see Secure JTAG doc)

### 2.2 Hardware responsibility mapping
- HWR-SA-1: Auth timing targets met through crypto acceleration
- HWR-SA-2: Hardware-backed credential handling and key protection
- TCR-SA-3: Lifecycle state contributes to trust decisions

## 3. Software Static Architecture

### 3.1 Software blocks
- DCM SecurityAccess state machine
- Authentication challenge/response module
- Authorization policy evaluator
- Protected service gates (RequestDownload, RoutineControl, WriteData)
- Session timeout/revocation manager
- Secure logging emitter

```mermaid
graph LR
  Auth[Challenge/Response] --> Policy[Authorization Policy]
  Policy --> Gate[Protected Service Gate]
  Gate --> Svc[Service Handlers]
  Policy --> Sess[Session/Timeout Manager]
  Gate --> Log[Secure Logging]
```

### 3.2 Software requirement allocation
- SWR-SA-1: DCM gates protected UDS services by access level
- SWR-SA-2: Enforce timeout, retry counter, lockout windows
- SWR-SA-3: Validate access state per protected request
- SWR-SA-4: Log and expose security failures

## 4. Dynamic / Behavioral Views

### 4.1 Secure access challenge-response flow

```mermaid
sequenceDiagram
  participant T as Tester
  participant D as DCM SecurityAccess
  participant C as Crypto Module
  participant G as Protected Service Gate
  participant L as Secure Logging

  T->>D: Request security access seed/challenge
  D->>T: Nonce/challenge
  T->>D: Response token
  D->>C: Verify token + freshness
  alt Valid
    D->>G: Grant scoped access with timeout
    T->>G: Request protected service
  else Invalid
    D->>L: Log failure + increment retry
    D-->>T: Deny / lockout/backoff
  end
```

### 4.2 Behavioral requirement focus
- Deny-by-default unless access state is valid (CSR-SA-1, FCR-SA-2)
- Anti-replay and freshness are mandatory in challenge-response (CSR-SA-2)
- Retries, lockout, timeout, and automatic revocation are enforced (CSR-SA-3, CSR-SA-5, SWR-SA-2)
