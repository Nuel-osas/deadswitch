# DoraHacks Submission — Deadswitch

## Name
Deadswitch

## Tagline (one line)
A loan that dies the instant its collateral moves on another chain — no bridge, no relayer, no price feed.

## Track
DeFi

## Elevator (3 sentences)
Cross-chain lending today trusts a middleman to answer one question: is the collateral still
there? Deadswitch removes the middleman — collateral lives in a vault on Sepolia, the debt lives
on Creditcoin, and when a withdrawal drops the collateral below threshold, *anyone* can prove it
to Creditcoin through the Attestcoin oracle and the position liquidates in the same transaction
the proof verifies. The trust comes from the attestor quorum, not from any bridge, relayer, or
oracle committee.

## Why this could only be built on Creditcoin / Attestcoin
The entire product is trust-minimized verification of a foreign-chain event inside a smart
contract. Without Attestcoin's native `0x0FD2` precompile you need a bridge or a centralized
oracle — exactly the trusted third party Deadswitch exists to delete. The oracle is not a
feature we added; it is the mechanism. Remove it and there is no project.

## What it does (mechanism)
1. `CollateralVault.withdraw()` on Sepolia emits `CollateralWithdrawn(positionId, amount, remaining)`.
2. Creditcoin's attestor network attests the Sepolia block (continuity proofs bridge the gaps
   between attestation checkpoints).
3. Any observer fetches an inclusion + continuity proof and calls `DeadswitchManager.execute()`.
4. The `0x0FD2` precompile verifies the proof synchronously, in the same transaction.
5. The manager decodes the receipt, authenticates it, and liquidates if `remaining < minCollateral`.

The lifecycle runs both ways: a collateral top-up on Sepolia, proven the same way, restores a
position before it dies. Same primitive, opposite direction.

## What makes it more than a tutorial fork — the security work
Creditcoin's precompile proves *inclusion*, not *success*, and says nothing about *who* emitted
a log. A naive cross-chain manager is exploitable two ways, both of which we demonstrate live
against a deliberately-naive contract (`yarn exploit`):

- **Forged event, fake vault.** Anyone can deploy a contract that emits `CollateralWithdrawn`
  with a victim's positionId. The event is real and provable; the vault is a lie. The naive
  manager liquidates the victim. Deadswitch requires the emitter to be the registered vault and
  rejects with `"Event not emitted by registered vault"`.
- **Reverted transaction.** A failed withdrawal still produces a valid inclusion proof. The naive
  manager acts on it. Deadswitch requires `receiptStatus == 1` and rejects with
  `"Source transaction did not succeed"`.

Third defense: the ~10-minute attestation wait is finality protection — Deadswitch never
liquidates on a Sepolia block that could still be reorged away. See `SECURITY.md`.

## Live on testnet (real transactions)
| Contract | Chain | Address |
|---|---|---|
| CollateralVault | Sepolia | 0x80366d27b907828A36243140ce6ACED6350EE412 |
| DeadswitchManager | Creditcoin CC3 | 0x70FD9432620accb22E015E3929FF948B41aa3BD4 |

- A real position, liquidated by a proven cross-chain withdrawal, autonomously by the keeper.
- Both exploits demonstrated failing against Deadswitch and succeeding against the naive manager.

## Repo
https://github.com/Nuel-osas/deadswitch  (contracts, keeper, exploit demo, SECURITY.md, run instructions)

## Run it in one command
```
yarn install && cp .env.example .env   # add a testnet private key
yarn server                            # console UI + permissionless keeper on :4020
```
Withdraw collateral on the Sepolia pane; watch the position die on the Creditcoin pane, with the
attestation progress visible between them. `yarn exploit <tx> <id>` runs the attack demo.

## Scope (honest)
MVP: one collateral asset, one source chain, full liquidation + collateral restore. No interest
accrual, no auctions, no matching engine — those are products on top of the primitive. The
submission is the trust-minimized liquidation path and the security work that makes it safe.
