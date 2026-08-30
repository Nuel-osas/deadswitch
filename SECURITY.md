# Security notes — why Deadswitch has two checks the tutorial doesn't

Creditcoin's `0x0FD2` precompile proves one thing: **a transaction was included in an
attested source-chain block.** It does not prove the transaction *succeeded*, and it does not
say *who* emitted the logs inside it. A cross-chain app that treats a valid inclusion proof as
"this thing really happened the way I expect" is exploitable. Deadswitch adds two guards. This
document demonstrates both attacks against a deliberately-naive manager and shows Deadswitch
rejecting the same proofs.

Run it yourself: `yarn exploit <forge_tx_hash> <victim_position_id>`

## Contracts involved

| Contract | Role |
|---|---|
| `DeadswitchManager` | the real manager — status check + emitter check |
| `NaiveManager` | identical logic with both checks removed — exists only to be attacked |
| `MaliciousVault` | a fake vault an attacker deploys to emit forged events |

## Attack 1 — forged event from a fake vault (missing emitter check)

`CollateralWithdrawn(uint256 indexed positionId, uint256 amount, uint256 remaining)` is a public
event signature. **Anyone** can deploy a contract that emits it with someone else's `positionId`
and `remaining = 0`. The event is genuine and provable — the *vault* is a lie.

`MaliciousVault.forge(101)` emits `CollateralWithdrawn(#101, 0, 0)`. The attacker proves it
through the oracle exactly like a real event and submits it.

- **NaiveManager** reads `log.topics[1]` as the positionId, sees `remaining (0) < min (50)`, and
  **liquidates position #101 — a healthy position the attacker does not own.**
- **DeadswitchManager** requires `log.address_ == sourceVault` and rejects with
  **`"Event not emitted by registered vault"`.**

Proven on testnet:
- forge tx (Sepolia): [`0x4a039a…721f`](https://sepolia.etherscan.io/tx/0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f)
- NaiveManager: `💀 EXPLOITED. liquidated position #100 from a FORGED event`
- DeadswitchManager: `🛡️ REJECTED: "Event not emitted by registered vault"`

## Attack 2 — reverted transaction still proves (missing status check)

The precompile proves inclusion, not success. A withdrawal that **reverted** still sits in the
block and still produces a valid inclusion proof. If a manager decodes the receipt without
checking `receiptStatus`, an attacker can point it at a failed withdrawal — the collateral never
actually moved, but the manager acts as if it did.

- **NaiveManager** omits `require(receipt.receiptStatus == 1)` and acts on the failed tx.
- **DeadswitchManager** requires `receiptStatus == 1` and rejects with
  **`"Source transaction did not succeed"`.**

The same guard protects the deposit/restore path: a reverted top-up must not revive a dead
position that was never actually funded.

## Why the ~10-minute attestation wait is a third defense

Attestors only attest a Sepolia block once it can no longer be reorged away. A liquidation fired
on an unfinalized block could be *un-happened* by a reorg, leaving a dead position on Creditcoin
whose triggering withdrawal no longer exists on the source chain. By waiting for finality before
any proof is accepted, Deadswitch never liquidates on a block that can still disappear. Quorum
itself resists forged blocks: honest attestors following the canonical chain via independent RPCs
compute one set of digests; a malicious attestor's fabricated block produces different digests
and can never reach quorum.

## Takeaway

The tutorial teaches how to *read* a cross-chain event. Making that read **safe** to act on —
authenticating the emitter, rejecting failed transactions, and waiting out reorgs — is the
actual protocol engineering. Deadswitch is those three guards wrapped around a liquidation.
