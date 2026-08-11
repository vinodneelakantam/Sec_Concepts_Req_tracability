# Runtime Tamper Monitoring and Detection (RTMD) Security Architecture Requirements - TDA4VM ADAS ECU

## 1. System Static Architecture

### 1.1 System entities
- Runtime-monitored ECU (TDA4VM)
- Safety manager/supervisor
- Gateway or SOC for event collection
- Cloud/backend for fleet incident analytics
- Service/tester endpoint for diagnostics

### 1.2 Trust boundaries and interfaces
- Boundary A: ECU security monitor to safety manager (graded-response contract)
- Boundary B: ECU to gateway/backend telemetry path (forensic evidence export)
- Boundary C: Tester diagnostics interface to protected monitoring status
- Boundary D: Monitor policy/configuration boundary (only authorized updates)

```mermaid
graph LR
  ECU[TDA4VM ECU] --> MON[RTMD Monitor]
  MON --> SAFE[Safety Manager]
  MON --> LOG[Secure Logging]
  LOG --> GW[Gateway/SOC]
  GW --> CLOUD[Cloud Analytics]
  TEST[Tester] -->|Protected Diagnostics| ECU
```

### 1.3 System-level requirement allocation

**Cybersecurity Requirements (CSR)**
- CSR-RTMD-1: Selected code/data/control indicators shall be monitored during runtime.
- CSR-RTMD-2: Detection events shall trigger graded response actions by severity/confidence.
- CSR-RTMD-3: Evidence for detections and actions shall be preserved for post-incident analysis.
- CSR-RTMD-4: Monitoring shall combine periodic checks and event-triggered checks.
- CSR-RTMD-5: Response actions shall be coordinated with safety management logic.

**Functional Security Concept (FSC)**
- FSC-RTMD-1: Combine continuous (periodic) and event-triggered detection so that both slow-drift tampering and sudden anomalies are caught.
- FSC-RTMD-2: Scale the response to the confidence and severity of what was detected, rather than a single fixed reaction for every anomaly.
- FSC-RTMD-3: Preserve a forensic trail from first detection through the action finally taken, so incidents remain analyzable after the fact.

**Functional Security Requirements (FSR)**
- FSR-RTMD-1: Defined code, data, and control-flow indicators shall be evaluated on both a periodic schedule and in response to specific trigger events.
- FSR-RTMD-2: Each detection shall be classified by severity/confidence and mapped to a predetermined response tier before any action is taken.
- FSR-RTMD-3: Detection evidence (indicator, timestamp, context) shall be captured and retained independently of whether the response mitigates the condition.
- FSR-RTMD-4: Both periodic and event-triggered monitoring paths shall feed the same classification and response logic, avoiding duplicated or conflicting handling.
- FSR-RTMD-5: A response action affecting vehicle behavior shall be coordinated with safety state management before being applied.

**Functional Cybersecurity Concept (FCR)**
- FCR-RTMD-1: Combine periodic integrity checks with trigger-based checks (reset anomalies, debug-state changes, repeated auth anomalies).
- FCR-RTMD-2: Apply deterministic policy mapping from detection class to response tier.
- FCR-RTMD-3: Coordinate security reactions with safety state manager to avoid unsafe abrupt transitions.
- FCR-RTMD-4: Keep forensic continuity from detection through mitigation.

**Technical Cybersecurity Concept (TCR)**
- TCR-RTMD-1: Use SA2UL-assisted hashing for runtime integrity computation.
- TCR-RTMD-2: Compare against protected reference values from secure storage/NvM design.
- TCR-RTMD-3: Integrate outcomes with DEM/EcuM response logic and secure logging path.
- TCR-RTMD-4: Correlate watchdog/reset/status context for diagnosis and controlled recovery.

## 2. Hardware Static Architecture

### 2.1 Hardware elements
- TDA4VM (J721E) execution domains: Cortex-A72, Cortex-R5F, DMSC (System Firmware/TIFS)
- SA2UL hash/crypto accelerator used for runtime re-hashing
- DMSC BootROM and secure boot chain as the trust anchor the monitor extends at runtime
- Flash/NvM for reference values and evidence persistence
- Reset/watchdog/status peripherals
- JTAG/Sec-AP debug interface state indicators

### 2.2 Hardware responsibility mapping
- HWR-RTMD-1: Hardware crypto supports periodic integrity checks
- HWR-RTMD-2: Reset/watchdog telemetry available for correlation
- HWR-RTMD-3: Evidence storage survives power interruption

## 3. Software Static Architecture

### 3.1 Software blocks
- RTMD scheduler (periodic + event-triggered)
- Integrity checker (hash/reference comparator)
- Detection classifier and policy engine
- Safety response coordinator
- Secure logging adapter

```mermaid
graph LR
  SCH[RTMD Scheduler] --> CHK[Integrity Checker]
  CHK --> CLS[Detection Classifier]
  CLS --> POL[Response Policy Engine]
  POL --> SAFE[Safety Coordinator]
  POL --> LOG[Secure Logging]
```

### 3.2 Software requirement allocation
- SWR-RTMD-1: Tiered responses (warn/degrade/reset)
- SWR-RTMD-2: Periodic and triggered execution modes
- SWR-RTMD-3: Evidence structure with region/time/action metadata
- SWR-RTMD-4: Deterministic safety-coordinated response

## 4. Dynamic / Behavioral Views

### 4.1 Runtime tamper detection sequence

```mermaid
sequenceDiagram
  participant S as RTMD Scheduler (periodic tick + event triggers)
  participant C as Integrity Checker (R5F/A72 task)
  participant Y as SA2UL (SHA-256/512)
  participant N as Protected NvM (reference digests)
  participant P as Policy Engine
  participant DM as DEM (event manager)
  participant EM as EcuM/Safety State Manager
  participant L as Secure Logging
  participant W as Watchdog/Reset Controller

  alt Periodic schedule table tick
    S->>C: Trigger scheduled region check (code segment / calibration table)
  else Event trigger
    S->>C: Reset-reason register change, debug-state change (from TIFS), or repeated auth failure count
  end
  C->>Y: Compute digest of target region
  Y-->>C: Digest
  C->>N: Fetch protected reference digest (itself integrity-tagged)
  C->>C: Compare digest vs reference
  alt Match
    C-->>S: Pass, no action
  else Mismatch
    C->>P: Region ID + digest delta + confidence
    P->>P: Classify severity (code-region tamper = critical, calibration drift = moderate)
    P->>DM: Raise DEM event (event ID, region, timestamp, task ID)
    P->>EM: Request graded response bounded by current safety state (no abrupt actuator change mid-cycle)
    EM-->>P: Approved response tier (warn/degrade/reset)
    P->>L: Persist evidence (region, expected vs actual digest, action, watchdog/reset context)
    opt Response tier = reset
      P->>W: Request controlled ECU reset
      W->>C: Re-arm monitor after DMSC BootROM chain re-establishes known-good baseline
    end
  end
```

### 4.2 Behavioral requirement focus
- Monitoring runs on both a scheduled cadence and discrete triggers (reset-reason register, TIFS debug-state change notification, repeated SecurityAccess failures) rather than a single polling loop (CSR-RTMD-4, FCR-RTMD-1)
- Severity classification is table-driven (region/class -> tier), and any reset-tier response is arbitrated through EcuM/safety-state logic so it cannot fire mid safety-critical actuation cycle (CSR-RTMD-2, CSR-RTMD-5, FCR-RTMD-3)
- Reference digests themselves are protected (stored with their own integrity tag in NvM) so a compromised reference cannot mask a real violation (TCR-RTMD-2)
- Evidence recorded includes region ID, expected-vs-actual digest, and correlated watchdog/reset/debug-state context to support root-cause diagnosis, not just a pass/fail flag (CSR-RTMD-3, TCR-RTMD-4)
- A reset-tier response re-enters the DMSC BootROM chain, giving the monitor a freshly attested baseline rather than re-arming against a potentially compromised state (TCR-RTMD-3)
