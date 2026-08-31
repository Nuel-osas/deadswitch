# Hardening the `0x0FD2` trust boundary

Creditcoin's `0x0FD2` precompile proves one thing: **a transaction was included in an attested
source-chain block.** Everything else — whether it succeeded, who emitted its logs, whether you
have already acted on it, whether it is stale — is the consuming contract's problem.

Gluwa's loan tutorial already teaches two of those guards, and Deadswitch adopts them:

- `USCLoanManager.sol:240` — `require(receipt.receiptStatus == 1, "Transaction did not succeed")`
- `USCLoanManager.sol:267` — `require(log.address_ == sourceLoanContract, ...)`, with the attack
  spelled out in the comment at `:263-265`

Both landed in PR #92 (`4ff9a3b`, 2026-07-29). `loan-flow/README.md` §1.5 teaches registering the
source contract as a numbered step. **Deadswitch implements all ten of the tutorial's guards.**

This document covers what the tutorial does *not* have: an executable proof that the emitter
guard is load-bearing, and two structural flaws in `USCBase` itself that defeat any manager built
on it — including Deadswitch v2.

Reproduce: `yarn exploit <tx> <positionId>` and `yarn attack <suppression|decoy> <tx> <positionId>`.

---

## Demonstration 1 — the emitter guard is load-bearing

`CollateralWithdrawn(uint256 indexed, uint256, uint256)` is a public event signature. Anyone can
deploy a contract that emits it with a victim's `positionId` and `remaining = 0`. The event is
genuine and provable; the *vault* is a lie.

`MaliciousVault.forge(101)` does exactly that. The attacker proves it through the oracle like any
real event and submits it to two managers:

| Manager | Result |
|---|---|
| `NaiveManager` (guards removed) | `PositionLiquidated(#101)` — a healthy position the attacker does not own |
| `DeadswitchManager` | reverts `"Event not emitted by registered vault"` |

Forge tx (Sepolia): [`0x4a039a…721f`](https://sepolia.etherscan.io/tx/0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f)

This is the executable version of the tutorial's comment. `NaiveManager` is a contract we built by
*removing* Gluwa's checks — it is a control, not a claim about the tutorial.

---

## Finding A — action-selector suppression (defeats any `USCBase` consumer)

`USCBase.execute` takes a **caller-supplied `action`** and marks the query consumed:

```
queryId = keccak256(chainKey, blockHeight, txIndex)   // USCBase.sol:30 — `action` is NOT in it
processedQueries[queryId] = true;                     // USCBase.sol:41 — burned regardless of action
```

So a borrower emits a deposit *and* a withdrawal in **one transaction**, then submits it as a
deposit. The deposit branch records healthy collateral; the queryId is burned; the withdrawal in
that same transaction can never be proven.

`Attacker.suppress(200, 100e18)` — `vault.deposit(200, 1 wei)` then `vault.withdraw(200, 100 TST)`.
Sepolia tx [`0x979a57…fffd3`](https://sepolia.etherscan.io/tx/0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3)

**Against v2 (inherits `USCBase`):**
```
Attacker submits as action=1 (DEPOSIT), hiding the withdrawal.
  accepted. attested collateral = 100.000000000000000001, status = ACTIVE
Anyone now submits the SAME transaction as action=0 (WITHDRAWAL):
  REVERTED: "Query already processed"
```
The collateral is gone. The position reports **100 TST and ACTIVE**. It can never be liquidated.

**Against v3:**
```
CollateralAttested(#200): remaining 100.000000000000000001
CollateralAttested(#200): remaining 0.000000000000000001
PositionLiquidated(#200): 0.000000000000000001 < 50.0
```

---

## Finding B — decoy-log censorship (the emitter guard becomes the weapon)

A `USCBase` consumer reads `logs[0]` and reverts if it fails the emitter check. Prefix a decoy
`CollateralWithdrawn` from a throwaway contract in the same transaction and the genuine
withdrawal is **permanently unprovable** — the guard that stops Demonstration 1 becomes a
censorship vector.

`Attacker.censor(decoy, 201, 100e18)` — `decoy.emitFake(201)` then `vault.withdraw(201, 100 TST)`.
Sepolia tx [`0x6f88a9…1bfa3`](https://sepolia.etherscan.io/tx/0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3)

**Against v2 (inherits `USCBase`):**
```
Submitting the genuine withdrawal (decoy log sits at logs[0]):
  REVERTED: "Event not emitted by registered vault"
```
Note the revert string. It is the *same guard* that saves the position in Demonstration 1 — here
it destroys it. A guard that rejects a whole transaction because of one log it does not own is a
denial-of-service primitive.

**Against v3:**
```
CollateralAttested(#201): remaining 0.0
PositionLiquidated(#201): 0.0 < 50.0
```

The same `logs[0]` shortcut exists in the tutorial at `USCLoanManager.sol:254-257`.

---

## The v3 fix

`DeadswitchBase.sol` replaces `USCBase` with four changes:

1. **`action` is deleted from the external ABI.** The action is derived from each log's own
   `topics[0]`. A caller cannot choose which half of a transaction gets seen.
2. **Every log from the registered vault is applied, in log order.** One transaction carrying a
   deposit and a withdrawal produces both state transitions, in the right sequence.
3. **Foreign logs are skipped, never reverted on.** A decoy cannot censor a genuine event.
4. **`blockHeight` is threaded into the handler** and stored per position, so a stale proof
   cannot overwrite newer attested state. `USCBase` passes only the queryId, which makes this
   guard impossible to write.

Both findings are filed upstream against `gluwa/usc-testnet-bridge-examples`.

---

## On `receiptStatus`

An earlier draft of this document claimed a reverted source transaction could carry a
`CollateralWithdrawn` log. **That is wrong.** Under EIP-658 a reverted transaction's receipt
carries no logs at all, so the log-presence check subsumes the status check on EVM sources. The
`require(receiptStatus == 1)` remains as an explicit invariant — it protects against non-EVM
source chains and decoder changes where that guarantee does not hold — but it is not an exploit
we can demonstrate, and we no longer claim it is.

---

## The ~10-minute attestation wait is a third defense

Attestors will not attest a Sepolia block that can still be reorged away. A liquidation fired on
an unfinalized block could be *un-happened* by a reorg, leaving a dead position on Creditcoin
whose triggering withdrawal no longer exists. Deadswitch never acts on a block that can still
disappear. Quorum resists forged blocks structurally: honest attestors following the canonical
chain compute one set of digests, and a fabricated block produces different digests that can
never reach quorum.
