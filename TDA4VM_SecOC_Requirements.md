---
layout: default
title: Secure Communication
nav_title: Secure Comm
---

# Secure Communication Requirements (incl. AUTOSAR SecOC) - TDA4VM ADAS ECU

This doc covers the full in-vehicle and off-board secure communication stack: per-PDU authenticity
and freshness protection using the AUTOSAR SecOC pattern (truncated freshness value + MAC appended
to an Authentic PDU to form a Secured PDU), confidentiality-protected channels for sensitive
payloads (SA2UL AES-GCM), off-board (cloud/backend) TLS/mTLS sessions, and the shared key/session
management underlying all three.

## 1. Functional Security Concept

### 1.1 Cybersecurity Requirements (CSR)
- CSR-SECOC-1: Every Authentic PDU broadcast on the in-vehicle bus that is security-relevant (control-relevant, safety-adjacent, or diagnostic-triggering) shall carry a cryptographic MAC binding its payload to a specific sender-known symmetric key.
- CSR-SECOC-2: Every protected PDU shall carry a freshness indicator that is verified independently of the MAC, so a replayed-but-authentic frame is still rejected.
- CSR-SECOC-3: The MAC computation shall bind the PDU's identity (Data ID) into the authenticated data, so a valid MAC computed for one PDU cannot be replayed as if it belonged to a different PDU using the same key.
- CSR-SECOC-4: A verification failure (freshness out-of-window or MAC mismatch) on a protected PDU shall result in the Secured PDU being dropped before delivery to the receiving application, with the outcome recorded as a security event.
- CSR-SECOC-5: The pre-shared symmetric key material used for MAC generation/verification shall never be exposed to application software in the clear, and shall be reachable only through the TDA4VM hardware crypto accelerator.
- CSR-SECOC-6: Sensitive payloads exchanged in-vehicle or off-board shall use a confidentiality-protected channel (SA2UL AES-GCM in-vehicle, TLS/mTLS off-board) appropriate to their classification, independent of the SecOC authenticity/freshness mechanism.
- CSR-SECOC-7: A confidentiality-channel or off-board session verification failure (AES-GCM tag mismatch, TLS/mTLS handshake failure) shall result in fail-closed behavior, the same as a SecOC verification failure.
- CSR-SECOC-8: Key material for both SecOC MAC operations and confidentiality-channel encryption shall be lifecycle-managed (rotation/revocation) through a single shared Key/Session Manager, without a window where both old and new keys are simultaneously accepted beyond a defined transition policy.

### 1.2 Functional Security Concept (FSC)
- FSC-SECOC-1: Realize per-PDU authenticity via the AUTOSAR SecOC-pattern framing: prepend/append a truncated freshness value and a truncated MAC to each Authentic PDU to form the Secured PDU, verified at the receiver before the payload is released to its application.
- FSC-SECOC-2: Treat freshness verification as a first-class, independent gate ahead of/alongside MAC verification, never inferring freshness validity from MAC validity alone.
- FSC-SECOC-3: Anchor all MAC key material in the TDA4VM hardware crypto/key-management chain (SA2UL + DMSC-provisioned keys), never in application-reachable memory.
- FSC-SECOC-4: Protect sensitive payloads with confidentiality appropriate to their exposure (in-vehicle AES-GCM, off-board TLS/mTLS), applied independently of, and in addition to, SecOC's authenticity/freshness protection for control-relevant traffic.

### 1.3 Functional Security Requirements (FSR)
- FSR-SECOC-1: The SecOC TX module shall retrieve the current Tx Freshness Value for a given PDU's Data ID from the Freshness Value Manager immediately before MAC computation, not from a cached/stale value.
- FSR-SECOC-2: The SecOC RX module shall reconstruct the full freshness value from the truncated wire value and a locally tracked freshness window per Data ID, rejecting any value outside that window.
- FSR-SECOC-3: MAC verification shall use the same Data ID and key reference that were used at the sender, and any mismatch (key, Data ID, or MAC value) shall be treated as a verification failure, not a partial-trust condition.
- FSR-SECOC-4: On verification failure, the Secured PDU shall not be forwarded to PduR/application layer under any configuration, and the failure shall be reported to secure logging with the PDU's Data ID and failure reason.
- FSR-SECOC-5: Key material provisioning/rotation for SecOC-protected PDUs shall be coordinated through the same key/session manager used elsewhere in the ECU's secure communication stack, never a SecOC-private key store.
- FSR-SECOC-6: A sensitive payload shall only be transmitted over a channel providing confidentiality protection appropriate to its classification (SA2UL AES-GCM in-vehicle, TLS/mTLS off-board).
- FSR-SECOC-7: Key rotation or revocation for either SecOC MAC keys or confidentiality-channel keys shall take effect without a window in which both old and new keys are simultaneously accepted beyond a defined transition policy.

## 2. System Requirements and System Static Architecture

### 2.1 System entities
- Sender application (Authentic PDU producer)
- SecOC TX module (freshness retrieval, MAC request, Secured PDU assembly)
- SecOC RX module (freshness reconstruction, MAC verification, Secured PDU disassembly)
- Freshness Value Manager (Tx and Rx instances, tracked per Data ID)
- CSM (Crypto Service Manager) abstraction over SA2UL
- Key/session manager (shared by the SecOC and confidentiality/off-board stacks)
- CAN-FD/Ethernet bus transport
- Receiver application (Authentic PDU consumer)
- Secure logging
- Confidentiality channel encryptor/decryptor (SA2UL AES-GCM, for sensitive payloads)
- Off-board cloud/service endpoint (TLS/mTLS session, outside the SecOC PDU mechanism itself)

### 2.2 Trust boundaries and interfaces
- Boundary A: Sender application to SecOC TX module (Authentic PDU handoff)
- Boundary B: SecOC TX/RX to CSM/SA2UL crypto boundary (key handle only, never raw key)
- Boundary C: SecOC RX to receiver application (only after verification pass)
- Boundary D: SecOC to Key/Session Manager (key provisioning/rotation)
- Boundary E: SecOC RX to secure logging (verification failure telemetry)
- Boundary F: Confidentiality channel encrypt/decrypt boundary (SA2UL AES-GCM), key-handle gated identically to Boundary B
- Boundary G: ECU to off-board cloud/service endpoint (TLS/mTLS), anchored to the eFuse-derived device identity

```mermaid
graph LR
  App[Sender Application] --> Tx[SecOC TX Module]
  Tx --> Csm[CSM/SA2UL Crypto Boundary]
  Csm --> Rx[SecOC RX Module]
  Rx --> AppR[Receiver Application]
  Key[Key/Session Manager] --> Tx
  Key --> Rx
  Rx --> Log[Secure Logging]
  App --> Conf[Confidentiality Encryptor/Decryptor]
  Conf --> AppR
  Key --> Conf
  App --> OB[Off-board Cloud/Service Endpoint]
  Key --> OB
```

### 2.3 System Requirements (SYSR)
- SYSR-SECOC-1: The SecOC TX module shall be the only system entity permitted to submit a PDU for MAC computation via the CSM/SA2UL boundary (Boundary B), so no other module can request a signed frame using SecOC key material.
- SYSR-SECOC-2: The system's Freshness Value Manager instances (Tx and Rx) shall track freshness state independently per Data ID, so a freshness fault on one PDU class does not affect verification of another.
- SYSR-SECOC-3: The SecOC RX module shall be the only path through which a Secured PDU reaches the receiver application (Boundary C), so no bypass path can deliver an unverified payload.
- SYSR-SECOC-4: The Key/Session Manager boundary (Boundary D) shall serve identical key state to both the SecOC stack and the confidentiality-channel stack, so both use consistent revocation/rotation state.
- SYSR-SECOC-5: The Key/Session Manager shall be the single system-wide source of active keys and rotation/revocation policy consumed identically by the SecOC stack (Boundary D) and the confidentiality/off-board channel stack (Boundaries F, G).

## 3. Technical Security Concept

### 3.1 Technical Security Concept (TSC)
- TSC-SECOC-1: Compute the MAC using SA2UL AES-128-CMAC (or the configured equivalent primitive) over the Authentic PDU payload plus Data ID plus freshness value.
- TSC-SECOC-2: Track and verify freshness per Data ID using a monotonic counter reconstructed from a truncated wire value plus a locally maintained window.
- TSC-SECOC-3: Fail closed - any freshness or MAC verification failure discards the Secured PDU and raises a security event, never a degraded-trust delivery.
- TSC-SECOC-4: Source SecOC key material exclusively from the shared Key/Session Manager (Secure Storage-backed), never a SecOC-local key store.
- TSC-SECOC-5: Apply a protocol-appropriate protection profile per channel/PDU class - SecOC authenticity/freshness for control-relevant traffic, confidentiality (AES-GCM in-vehicle / TLS-mTLS off-board) additionally for sensitive payloads.

### 3.2 Technical Security Requirements (TSR)
- TSR-SECOC-1: SecOC TX/RX MAC generate/verify operations shall be performed via SA2UL AES-128-CMAC (or the configured equivalent primitive), never a software-only MAC implementation.
- TSR-SECOC-2: The freshness counter used per Data ID shall be persisted in a register/NvM location that survives ECU reset, so a reset cannot be used to reset freshness state to a replay-exploitable value.
- TSR-SECOC-3: The truncated freshness length and truncated MAC length transmitted on the wire shall be configured per PDU class based on bus bandwidth and required forgery-resistance margin, not a single fixed global value.
- TSR-SECOC-4: Verification failures shall be reported to secure logging with Data ID, failure class (freshness vs MAC), and a rate/velocity indicator suitable for RTMD correlation.
- TSR-SECOC-5: SecOC key material shall be obtained as a key handle from the Key/Session Manager (backed by TDA4VM Secure Storage KEK/DKEK-derived keys), never provisioned as a SecOC-private raw key blob.
- TSR-SECOC-6: Use SA2UL-assisted AES-GCM encryption for in-vehicle confidentiality-protected payloads.
- TSR-SECOC-7: Off-board sessions shall use TLS 1.2+/mTLS anchored to the device's eFuse-derived X.509 identity, with synchronized session nonces/IVs independent of the SecOC freshness mechanism.

## 4. Hardware Requirements and Hardware Static Architecture

### 4.1 Hardware elements
- SA2UL crypto engine: AES-128-CMAC (or configured MAC primitive) generate/verify path used by SecOC TX/RX
- DMSC/TIFS-provisioned symmetric key material (via keyring/DKEK, shared with the Secure Storage doc), reachable only as key handles
- Freshness counter register/NvM storage, persistent across resets, tracked per Data ID
- CAN-FD/Ethernet peripheral DMA path carrying Secured PDUs to/from the SecOC stack
- TDA4VM A72/R5F application cores hosting the SecOC TX/RX software stack
- SA2UL AES-GCM confidentiality encryption/decryption path (alongside the AES-128-CMAC MAC path)
- eFuse-anchored device X.509 identity used for off-board TLS/mTLS sessions

```mermaid
graph LR
  TX[SecOC TX Software Stack] --> SA2UL[SA2UL AES-128-CMAC Engine]
  RX[SecOC RX Software Stack] --> SA2UL
  SA2UL --> DMSC[DMSC/TIFS Key Handle Provisioning]
  TX --> FCTR[Freshness Counter Register/NvM]
  RX --> FCTR
  TX --> NETIF[CAN-FD/Ethernet DMA Peripheral]
  NETIF --> RX
  CONF[Confidentiality Software Stack] --> GCM[SA2UL AES-GCM Engine]
  GCM --> DMSC
  OB[Off-board TLS/mTLS Session] --> CERT[eFuse-Anchored X.509 Identity]
```

### 4.2 Hardware Requirements (HWR)
- HWR-SECOC-1: SA2UL provides the MAC generate/verify hardware path for every SecOC-protected PDU, with no software-only fallback in production configuration.
- HWR-SECOC-2: The freshness counter register/NvM location is hardware/NvM-backed so its value survives a warm or cold reset without external rewrite.
- HWR-SECOC-3: Key handles delivered to SA2UL for SecOC MAC operations originate only from the DMSC/TIFS-provisioned key chain, never a value written directly by application software.
- HWR-SECOC-4: The CAN-FD/Ethernet DMA path delivers frames to the SecOC RX stack without exposing the Secured PDU to the application-facing buffer ahead of verification.
- HWR-SECOC-5: SA2UL provides the hardware crypto path for confidentiality encryption/decryption (AES-GCM) operations, alongside the AES-128-CMAC MAC path used by SecOC.

## 5. Software Requirements and Software Static & Dynamic Architecture

### 5.1 Software blocks
- SecOC TX module (Authentic PDU to Secured PDU assembly)
- SecOC RX module (Secured PDU verification and disassembly)
- Freshness Value Manager (Tx and Rx instances, per Data ID)
- CSM (Crypto Service Manager) abstraction over SA2UL
- PduR routing to/from the upper application layer and lower CanIf/EthIf
- Key/session manager client (shared by the SecOC and confidentiality/off-board stacks)
- Secure logging connector
- TX/RX confidentiality wrapper (AES-GCM encryption/decryption for sensitive payloads)
- Off-board TLS/mTLS session manager
- Communication policy engine (routes control-relevant PDUs to the SecOC module, sensitive payloads to the confidentiality wrapper)

```mermaid
graph LR
  App[Sender Application] --> Pol[Communication Policy Engine]
  Pol --> Tx[SecOC TX Module]
  Pol --> ConfTx[TX Confidentiality Wrapper]
  Tx --> FVMTx[Freshness Value Manager Tx]
  Tx --> Csm[CSM/SA2UL Abstraction]
  Tx --> PduR[PduR]
  PduR --> Rx[SecOC RX Module]
  Rx --> FVMRx[Freshness Value Manager Rx]
  Rx --> Csm
  Rx --> AppR[Receiver Application]
  Rx --> Log[Secure Logging Connector]
  ConfTx --> ConfRx[RX Confidentiality Wrapper]
  ConfRx --> AppR
  ConfRx --> Log
  Key[Key/Session Manager Client] --> Csm
  Key --> ConfTx
  Key --> OBM[Off-board TLS/mTLS Session Manager]
```

### 5.2 Software Requirements (SWR)
- SWR-SECOC-1: SecOC TX module shall request the current Tx Freshness Value from the Freshness Value Manager for the PDU's Data ID before every MAC computation call to CSM.
- SWR-SECOC-2: SecOC RX module shall reject a Secured PDU whose reconstructed freshness value falls outside the configured window for its Data ID, before invoking MAC verification.
- SWR-SECOC-3: CSM abstraction shall only accept a key handle reference for MAC generate/verify calls, never a raw key value passed from PduR or application code.
- SWR-SECOC-4: On any verification failure, SecOC RX shall not invoke PduR's forwarding call for that PDU, and shall instead invoke the secure logging connector with Data ID and failure class.
- SWR-SECOC-5: Freshness Value Manager instances shall persist their per-Data-ID window/counter promptly enough that a controlled reset (e.g. secure reprogramming activation reset) does not itself trigger a false replay rejection at the next verified frame.
- SWR-SECOC-6: Reject an invalid confidentiality-channel authentication tag (AES-GCM) or off-board TLS/mTLS session validation failure, fail-closed before payload reaches the receiver application.
- SWR-SECOC-7: The Communication Policy Engine shall deterministically route control-relevant PDUs to the SecOC module and sensitive payloads to the confidentiality wrapper, never both paths for the same PDU.

### 5.3 SecOC-protected Authentic PDU authentication and freshness verification flow, plus confidentiality/off-board paths

<p align="center">
  <a href="{{ '/assets/diagrams/TDA4VM_SecOC_Requirements-sequence.png' | relative_url }}" target="_blank" rel="noopener">
    <img src="{{ '/assets/diagrams/TDA4VM_SecOC_Requirements-sequence.png' | relative_url }}" alt="SecOC-protected Authentic PDU authentication and freshness verification flow, plus confidentiality/off-board paths" style="max-width:100%;">
  </a>
</p>
<details markdown="1">
<summary>Mermaid source (for editing/regeneration)</summary>

```mermaid-source
sequenceDiagram
  participant App as Sender Application
  participant Tx as SecOC TX Module
  participant FM as Freshness Value Manager Tx
  participant Csm as CSM/SA2UL AES-128-CMAC
  participant Bus as CAN-FD/Ethernet
  participant Rx as SecOC RX Module
  participant FMR as Freshness Value Manager Rx
  participant AppR as Receiver Application
  participant L as Secure Logging
  participant Conf as Confidentiality Wrapper
  participant Gcm as SA2UL AES-GCM
  participant OB as Off-board TLS Session

  App->>Tx: Authentic PDU, Data ID D, payload
  Tx->>FM: Get current Tx Freshness Value for Data ID D
  FM-->>Tx: Freshness value, full and truncated wire form
  Tx->>Csm: Compute MAC over Data ID D, payload, freshness, using key handle
  Csm-->>Tx: Truncated MAC, configured length
  Tx->>Bus: Secured PDU, payload, truncated freshness, truncated MAC
  Bus->>Rx: Deliver frame
  Rx->>FMR: Reconstruct full freshness for Data ID D from truncated value and local window
  alt Freshness outside acceptable window
    Rx->>L: Drop, replay/freshness violation for Data ID D
  else Freshness in window
    Rx->>Csm: Recompute expected MAC using same key handle and Data ID D
    Csm-->>Rx: Expected MAC
    alt MAC mismatch
      Rx->>L: Drop, authentication failure for Data ID D
    else MAC match
      Rx->>AppR: Deliver payload, verified and fresh
    end
  end

  Note over Conf: Independent confidentiality-classified payload path
  App->>Conf: Sensitive payload for confidentiality-classified channel
  Conf->>Gcm: Encrypt payload with session key, AES-GCM
  Gcm-->>Conf: Ciphertext plus authentication tag
  Conf->>Bus: Confidentiality-protected frame
  Bus->>Conf: Deliver frame to receiver-side wrapper
  Conf->>Gcm: Decrypt and verify authentication tag
  alt Tag verification failure
    Conf->>L: Drop, confidentiality-channel authentication failure
  else Tag verification success
    Conf->>AppR: Deliver decrypted payload
  end

  Note over OB: Independent off-board path
  OB->>OB: TLS 1.2+/mTLS session using eFuse-anchored device X.509 identity
  OB->>L: Session establishment/failure logged separately from in-vehicle paths
```

</details>


### 5.4 Behavioral requirement focus
- SecOC frames carry a truncated freshness value plus an AES-128-CMAC-class MAC computed via SA2UL, bound to the PDU's Data ID (CSR-SECOC-1, CSR-SECOC-3, TSR-SECOC-1)
- Freshness is checked independently of, and before, MAC verification, so an authentic-but-replayed frame is rejected before spending a MAC computation cycle (CSR-SECOC-2, FSR-SECOC-2)
- Any verification failure is fail-closed: the Secured PDU never reaches the receiver application, and the failure is reported to secure logging with Data ID and failure class (CSR-SECOC-4, SWR-SECOC-4)
- The per-Data-ID freshness counter survives ECU reset, so a controlled reset (e.g. secure reprogramming activation) cannot be exploited to reset freshness state to a replay-exploitable value (TSR-SECOC-2, HWR-SECOC-2)
- SecOC key material is always referenced by handle from the shared Key/Session Manager, never a SecOC-private raw key (CSR-SECOC-5, TSR-SECOC-5, SWR-SECOC-3)
- Sensitive payloads are protected with SA2UL-assisted AES-GCM confidentiality encryption, and a tag verification failure is fail-closed before reaching the receiver application, independent of the SecOC MAC/freshness path (CSR-SECOC-6, CSR-SECOC-7, TSR-SECOC-6, SWR-SECOC-6)
- Off-board (cloud/backend) sessions use a separate TLS/mTLS trust path anchored to the device's eFuse-derived identity, independent from the in-vehicle bus-level SecOC/confidentiality schemes (CSR-SECOC-6, TSR-SECOC-7)
- The Communication Policy Engine deterministically routes control-relevant PDUs to the SecOC module and sensitive payloads to the confidentiality wrapper, never both for the same PDU (SWR-SECOC-7)
- Key rotation/revocation for SecOC MAC keys and confidentiality-channel keys is coordinated through one shared Key/Session Manager, with no window where both old and new keys are accepted beyond a defined transition (CSR-SECOC-8, FSR-SECOC-7, SYSR-SECOC-5)

## 6. Hardware-Software Interface (HSI)

### 6.1 HSI elements
- SA2UL AES-128-CMAC MAC generate/verify register interface (key-handle input only)
- Freshness counter register/NvM interface per Data ID
- CAN-FD/Ethernet DMA-to-SecOC-stack interface
- SA2UL AES-GCM encrypt/decrypt register interface (key-handle input only)
- Off-board TLS/mTLS session key and certificate interface

### 6.2 HSI Requirements (HSI)
- HSI-SECOC-1: The SA2UL MAC generate/verify interface shall accept only a pre-validated key handle from the Key/Session Manager, never a raw key value passed directly from the SecOC software stack.
- HSI-SECOC-2: The freshness counter register/NvM interface shall expose per-Data-ID read/increment operations that persist across reset without requiring re-provisioning by software.
- HSI-SECOC-3: The CAN-FD/Ethernet DMA interface delivering frames to SecOC RX shall not release the Secured PDU payload to the application-facing buffer until the SA2UL verification interface returns a pass status for both freshness and MAC.
- HSI-SECOC-4: The SA2UL AES-GCM encrypt/decrypt interface shall accept only pre-validated key handles from the Key/Session Manager, never raw key bytes passed directly from the confidentiality wrapper.
- HSI-SECOC-5: The off-board TLS/mTLS session interface shall present the device's eFuse-anchored X.509 identity without exposing the underlying private key to application memory.

## Interview Appendix: Expert Q&A (20 Questions)

The following expert-level Q&A set is intended for interview practice and design review on this topic.

| # | Question | Difficulty | Detailed answer | Evidence |
|---|---|---|---|---|
| 1 | Why is SecOC not just “encrypt the bus”? | L1 | SecOC is specifically about authenticity and freshness for in-vehicle communication, not just confidentiality. A message can be encrypted but still be replayed or modified if the bus allows a stale frame to be accepted. The design therefore verifies both the message identity and recency before the payload is trusted. | SecOC requirements, AUTOSAR SecOC principle |
| 2 | What is the difference between authenticity and freshness in SecOC? | L2 | Authenticity answers the question “who sent this?” while freshness answers “is this current or is it a replay?” A message can be authentic but still stale; a message can also be fresh but untrusted if the MAC or signature is invalid. SecOC is designed to reject both categories before a payload reaches the application logic. | CSR-SECOC-1, CSR-SECOC-2, FSR-SECOC-2 |
| 3 | Why does SecOC use a truncated freshness value on the wire? | L2 | The wire format needs a compact freshness indicator, but the ECU still needs the full semantic value to check its validity relative to a counter or synchronization window. Truncation reduces bandwidth while allowing the receiver to reconstruct the full state and validate the newest acceptable value. This is a tradeoff between efficiency and anti-replay strength. | SecOC freshness design |
| 4 | What is the practical impact of a replayed valid SecOC frame? | L2 | A repeated frame can cause the receiving module to act on stale data, such as an old command or outdated sensor value. That is problematic because replay may not be immediately visible to the application and may cause a wrong state transition. Freshness checks are designed to explicitly reject these old frames before the receiver acts on them. | CSR-SECOC-2, freshness requirement |
| 5 | Why is the MAC check done after freshness validation in the receiver flow? | L2 | Freshness is an early guard against replay attacks. If a frame is stale, the system should drop it before spending a MAC-verify computation or application processing cycle. This is a practical design choice that reduces attack surface and keeps the receiver fail-closed when the frame is not current. | FSR-SECOC-2, SecOC behavioral focus |
| 6 | Why is per-PDU authentication useful in a mixed-criticality automotive bus? | L3 | Not all PDUs need the same security treatment. Safety-critical and high-value messages deserve strong authenticity and freshness checks, while lower-risk traffic may be handled more efficiently. Per-PDU policy allows the system to apply security where the risk is greatest rather than adopting a single global policy for everything on the bus. | SecOC policy design |
| 7 | What is the purpose of the Key/Session Manager in the SecOC design? | L1 | The Key/Session Manager centralizes the handling of security material such as MAC and confidentiality keys and keeps them behind a controlled interface. That reduces direct key exposure in software and ensures the SecOC stack works with handles rather than raw secret values. | CSR-SECOC-5, TSR-SECOC-5, SWR-SECOC-3 |
| 8 | Why can a compromise of raw key material in software be more dangerous than a compromise of a key handle? | L3 | A raw key in application memory is easier to read, leak, or misuse, because it is now part of the ordinary execution environment. A key handle narrows the secret to a protected layer and makes the software responsible for the key reference rather than the actual secret. This is a major design principle for secure communication stacks. | HSI-SECOC-1, HSI-SECOC-4 |
| 9 | What role does SA2UL play in SecOC? | L1 | SA2UL provides the hardware acceleration for the cryptographic operations used by SecOC, such as CMAC and AES-GCM calculations. This reduces the risk that sensitive key material is exposed to general-purpose software and keeps verification in a more constrained execution domain. | SA2UL, HSI-SECOC-1, HSI-SECOC-4 |
| 10 | How does confidentiality differ from authenticity in the SecOC picture? | L2 | Confidentiality protects the content of sensitive messages from unauthorized disclosure, while authenticity protects the receiver from being tricked by a forged or tampered message. The repo separates these concepts so they can be applied where needed rather than assuming all traffic requires the same treatment. This allows a more tailored and performance-aware design. | SecOC requirements, confidentiality wrapper |
| 11 | Why is AES-GCM used for sensitive payload confidentiality? | L2 | AES-GCM provides confidentiality and authentication at the same time, which is ideal for a protected payload path. It allows the receiver to both decrypt the message and verify that it has not been modified. This reduces the number of separate cryptographic operations for sensitive payloads and keeps the design efficient while maintaining security. | SecOC confidentiality wrapper, AES-GCM design |
| 12 | What is the risk if the Key/Session Manager allows both old and new keys to remain valid too long? | L3 | That creates a migration window in which an attacker can exploit a stale or old key path to send valid-looking traffic. The design therefore requires a coordinated key rotation model with explicit transition rules. This is important because replay and impersonation attacks often exploit mixed key states. | CSR-SECOC-8, FSR-SECOC-7 |
| 13 | Why should the receiver reject a PDU before it reaches the application buffer? | L2 | The application buffer is a higher-level interface where trust assumptions are often stronger and user-facing services may process the payload without realizing it was not authenticated. By failing closed at the interface, the system keeps unverified data out of the application domain. This is a key design principle in security engineering. | HSI-SECOC-3, fail-closed policy |
| 14 | What is the security advantage of a separate off-board TLS/mTLS path? | L2 | Off-board communication follows a different trust model than in-vehicle bus traffic. Vehicle-to-cloud or backend communication may require certificate-based identity and session protection that is independent from internal SecOC. Separating the paths helps prevent one transport model from being mistaken for the other and keeps trust boundaries explicit. | CSR-SECOC-6, TSR-SECOC-7 |
| 15 | Why does the repo treat the off-board path as distinct from the in-vehicle path? | L3 | The trust anchors, interfaces, and risk models are different. In-vehicle communication uses SecOC-style authenticity and freshness; off-board communication uses TLS or mTLS with a device identity anchored to hardware identity. Mixing them would hide the real trust boundary and create confusion about where the root-of-trust is established. | off-board TLS path, eFuse identity requirement |
| 16 | What is the main security reason for a per-Data-ID freshness value? | L2 | Different PDUs can have different replay risks and different time semantics. A single global freshness value could be too coarse or too operationally restrictive, while a per-Data-ID freshness model allows each signal or message class to be tracked appropriately. That makes the anti-replay policy more precise and less prone to false positives or false negatives. | SecOC freshness design, HSI-SECOC-2 |
| 17 | Why is failure logging important for SecOC events? | L1 | Logs provide evidence that a message was rejected because of freshness, MAC mismatch, or confidentiality tag failure. Without logs, a failed verification event may be invisible to the site engineer or security team, making it harder to diagnose a replay or tampering attempt. | secure logging integration, fail-closed logging |
| 18 | How would a malicious actor try to bypass SecOC in practice? | L3 | They would try to replay an old valid frame, forge a valid-looking MAC with a stale key, or exploit a mixed-key rotation window. They could also attack the confidentiality path by tampering with the AEAD tag or modifying the freshness value while leaving the payload intact. The design works to block these by verifying freshness, MAC, and confidentiality tags before delivering the data. | SecOC attack paths, key rotation, anti-replay design |
| 19 | What is the central idea behind the policy engine in the SecOC design? | L2 | The policy engine determines which messages are routed to which security path based on their nature and sensitivity. That reduces accidental misclassification and keeps high-value traffic under stricter protection. The routing logic is part of the security design because it ensures the correct control is applied to the correct message class. | SecOC communication policy engine |
| 20 | If you had to summarize the whole SecOC design in one sentence, what would it be? | L1 | SecOC is a fail-closed, per-PDU authenticity and freshness model backed by hardware-assisted cryptography, explicit key handling, and separate confidentiality paths that reject replayed or tampered traffic before it can reach application logic. | SecOC requirements, HSI-SECOC-1 to HSI-SECOC-5 |
