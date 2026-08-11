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

**Functional Security Concept (FSC)**
- FSC-SRP-1: Separate delivery, verification, and activation into distinct stages so a failure at any stage cannot silently proceed to the next.
- FSC-SRP-2: Never allow the currently active, known-good image to be overwritten until a candidate image is fully verified.
- FSC-SRP-3: Reuse the same trust chain for post-update activation as for ordinary boot, rather than a reduced-check path.

**Functional Security Requirements (FSR)**
- FSR-SRP-1: A downloaded image shall be authenticated and integrity-checked before it is committed as the active image.
- FSR-SRP-2: An image whose version fails the anti-rollback policy shall be rejected regardless of otherwise-valid signature/integrity.
- FSR-SRP-3: An interruption during the flashing process shall leave the ECU able to boot a known-valid image, never an undefined or partially written one.
- FSR-SRP-4: The activation reset following reprogramming shall pass through the same verification chain used at ordinary power-on.
- FSR-SRP-5: Update metadata shall be checked against target identity, dependency, and version-compatibility policy before activation is permitted.

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
- HWR-SRP-3: eFuse SWREV anti-rollback policy anchored in the hardware trust chain (TCR-SRP-2)

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

### 4.1 Secure reprogramming sequence (ISO 14229-1 UDS flashing flow)

```mermaid
sequenceDiagram
  participant Tl as Tool (Tester/OTA backend)
  participant D as DCM (UDS stack)
  participant Y as SA2UL Crypto
  participant U as Update Manager
  participant Fd as Flash Driver (candidate/inactive bank)
  participant Dm as DMSC BootROM/System Firmware
  participant L as Secure Logging

  Tl->>D: DiagnosticSessionControl (0x10, programmingSession 0x02)
  Tl->>D: SecurityAccess (0x27) seed/key exchange - see Secure Access doc
  D-->>Tl: Access granted (programming level)
  Tl->>D: RoutineControl (0x31) CheckProgrammingPreconditions / EraseMemory (candidate bank)
  Tl->>D: RequestDownload (0x34) - address, size, compression/encryption format ID
  loop TransferData blocks
    Tl->>D: TransferData (0x36) block N
    D->>U: Forward block
    U->>Fd: Write block to candidate (inactive) bank
    U->>U: Accumulate streaming hash over received blocks
  end
  Tl->>D: RequestTransferExit (0x37)
  D->>U: Finalize candidate image
  U->>Y: Verify full-image X.509 signature (RSA-4K, SHA2-512) + SWREV vs manifest
  alt Signature/version check fails
    Y-->>U: Invalid
    U->>Fd: Discard candidate bank, keep active bank untouched
    U->>L: Log validation failure
    D-->>Tl: Negative response (verification failed)
  else Signature/version check passes
    Y-->>U: Valid
    Tl->>D: RoutineControl (0x31) CheckProgrammingDependencies (cross-ECU compatibility)
    alt Dependency check fails
      D-->>Tl: Negative response, activation blocked
      U->>L: Log dependency failure, candidate retained but not activated
    else Dependency check passes
      Tl->>D: ECUReset (0x11) - triggers activation
      D->>Dm: Reset into candidate bank
      Dm->>Dm: DMSC BootROM then System Firmware/TIFS then R5F SBL verification (same chain as normal boot)
      alt Boot verification fails
        Dm-->>Fd: Revert boot-select metadata to last known-good bank
        Dm->>L: Log activation failure + automatic rollback
      else Boot verification passes
        Dm-->>U: Boot success on new image
        U->>L: Log activation success (session ID, SWREV, timestamp)
      end
    end
  end
```

### 4.2 Behavioral requirement focus
- Reprogramming follows the standard UDS staged workflow - session control, SecurityAccess, erase/precondition check, block-wise download, transfer exit, dependency check, then reset-triggered activation - with an explicit commit decision at each gate (FCR-SRP-1, FCR-SRP-2)
- The active bank is never modified during download; only the candidate/inactive bank is written, so an interrupted transfer cannot leave the running image undefined (CSR-SRP-3, HWR-SRP-1)
- Full-image signature and SWREV/anti-rollback checks happen twice conceptually: once by the Update Manager/SA2UL at transfer-exit, and again by DMSC BootROM/System Firmware at activation reset using the same chain as ordinary power-on (CSR-SRP-4, TCR-SRP-3)
- Cross-ECU dependency/compatibility checks (RoutineControl CheckProgrammingDependencies) gate activation independently from image-integrity checks (CSR-SRP-5)
- A failed activation automatically reverts to the last known-good bank rather than leaving the ECU non-bootable (CSR-SRP-3, SWR-SRP-4)
