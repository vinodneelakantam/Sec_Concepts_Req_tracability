# Secure Reprogramming Architecture Requirements - TDA4VM ADAS ECU

## 1. System Static Architecture

### 1.1 System entities
- Authorized update source (tester or OTA backend)
- Gateway transport domain
- ECU update manager and installer domain
- Boot verification chain domain
- Logging and fleet operations domain

### 1.2 Trust boundaries and interfaces
- Boundary A: External update source to ECU download interface
- Boundary B: Downloaded candidate image to validation/commit boundary
- Boundary C: Commit boundary to activation reset/secure boot boundary
- Boundary D: Update state transitions to audit logging boundary

```mermaid
graph LR
  Src[Tester/OTA Source] --> GW[Gateway]
  GW --> UM[Update Manager]
  UM --> VAL[Validation Engine]
  VAL --> INST[Installer/Commit]
  INST --> BOOT[Secure Boot Chain]
  UM --> LOG[Secure Logging]
```

### 1.3 System-level requirement allocation

**Cybersecurity Requirements (CSR)**
- CSR-SRP-1: Downloaded images shall be authenticated and integrity-checked prior to activation.
- CSR-SRP-2: Anti-rollback policy shall reject vulnerable older versions.
- CSR-SRP-3: Interruption during flashing shall not create undefined executable state.
- CSR-SRP-4: Activation reset shall pass through the standard secure boot chain.
- CSR-SRP-5: Update metadata shall include compatibility/dependency policy inputs.

**Functional Cybersecurity Concept (FCR)**
- FCR-SRP-1: Use staged workflow (download, verify, commit, activate).
- FCR-SRP-2: Keep active and candidate images separable with explicit commit decision.
- FCR-SRP-3: Maintain rollback-safe recovery to last known-good executable image.
- FCR-SRP-4: Refuse activation if verification or policy checks fail.

**Technical Cybersecurity Concept (TCR)**
- TCR-SRP-1: Perform signature/hash checks using SA2UL-assisted cryptography.
- TCR-SRP-2: Enforce SWREV/equivalent monotonic version policy in trust chain.
- TCR-SRP-3: Activation shall re-run the DMSC BootROM -> System Firmware/TIFS -> R5F SBL -> application verification sequence.
- TCR-SRP-4: Log update state transitions and security failures using secure logging path.

## 2. Hardware Static Architecture

### 2.1 Hardware elements
- TDA4VM (J721E) update control and flash programming domain: Cortex-R5F (SBL/flashing), DMSC (System Firmware/TIFS)
- SA2UL cryptographic acceleration for signature/hash verification
- DMSC BootROM trust anchor re-entered at every activation reset
- Flash layout for active/candidate image separation
- Monotonic anti-rollback source: eFuse SWREV counter checked by System Firmware

### 2.2 Hardware responsibility mapping
- HWR-SRP-1: Active/candidate image separation with atomic metadata updates
- HWR-SRP-2: DMSC BootROM + System Firmware enforce activation authenticity checks
- TCR-SRP-2: eFuse SWREV anti-rollback policy anchored in the hardware trust chain

## 3. Software Static Architecture

### 3.1 Software blocks
- Update manager state machine
- Download and staging manager
- Signature/hash/version/compatibility validator
- Installer and commit controller
- Rollback/known-good recovery manager
- Secure logging integration

```mermaid
graph LR
  Stg[Staging Manager] --> Val[Validation Engine]
  Val --> Commit[Commit Controller]
  Commit --> Act[Activation Controller]
  Act --> Rec[Rollback/Known-good Manager]
  Commit --> Log[Secure Logging]
```

### 3.2 Software requirement allocation
- SWR-SRP-1: Deterministic update state machine with interruption recovery
- SWR-SRP-2: Validation gates for signature/integrity/version/compatibility
- SWR-SRP-3: Block activation on policy or validation failure
- SWR-SRP-4: Automatic rollback/known-good recovery after failed activation

## 4. Dynamic / Behavioral Views

### 4.1 Secure reprogramming sequence

```mermaid
sequenceDiagram
  participant U as Update Source
  participant M as Update Manager
  participant V as Validator/Crypto
  participant I as Installer
  participant B as Secure Boot Chain
  participant L as Secure Logging

  U->>M: Transfer candidate image + metadata
  M->>V: Verify signature/hash/version/compatibility
  alt Validation pass
    M->>I: Commit candidate image
    I->>B: Trigger activation reset
    B-->>M: Boot verification result
    M->>L: Log success state
  else Validation fail
    M->>M: Reject activation
    M->>L: Log failure + keep known-good image
  end
```

### 4.2 Behavioral requirement focus
- Staged workflow and explicit commit decision are mandatory (FCR-SRP-1, FCR-SRP-2)
- Activation always passes through secure boot chain (CSR-SRP-4, TCR-SRP-3)
- Known-good recovery remains available after failed activation (CSR-SRP-3, SWR-SRP-4)
