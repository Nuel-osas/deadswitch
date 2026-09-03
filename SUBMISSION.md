# DoraHacks Submission — Deadswitch

## Name
Deadswitch

## Tagline (one line)
Collateral on Ethereum, debt on Creditcoin — the loan liquidates itself when the collateral leaves, proven by an Attestcoin receipt from the source chain. No bridge, no relayer, no price feed.

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

## The security work

Creditcoin's `0x0FD2` precompile proves *inclusion*. Everything else — success, emitter identity,
replay, staleness — is the consuming contract's problem. Gluwa's loan tutorial already teaches
emitter authentication and receipt-status checking (`USCLoanManager.sol:240` and `:267`, PR #92,
`4ff9a3b`, 2026-07-29). **Deadswitch implements all ten of the tutorial's guards, and adds three
things it does not have.**

**1. An executable proof that the emitter guard is load-bearing.** `MaliciousVault` forges a real,
provable `CollateralWithdrawn` for a position it does not own. The identical proof liquidates an
unguarded manager on CC3 and bounces off Deadswitch with `"Event not emitted by registered vault"`.

**2. Two structural flaws in `USCBase` itself, demonstrated live — they defeat any manager built
on the tutorial, including Deadswitch v2.**

- *Action-selector suppression.* The replay key is `keccak(chainKey, blockHeight, txIndex)` — it
  omits `action`, which the caller supplies. One transaction carrying both a deposit and a
  withdrawal, submitted as a deposit, makes the withdrawal permanently unprovable. On v2 the
  drained position reports **100 TST and ACTIVE** while the collateral is gone.
  Tx `0x979a5719…`
- *Decoy-log censorship.* Consumers read `logs[0]` and revert on the emitter check. A decoy event
  prefixed in the same transaction makes a genuine withdrawal permanently unprovable — the guard
  from (1) becomes the weapon. Tx `0x6f88a998…`

**3. The v3 fix.** `DeadswitchBase.sol`: the action is derived from each log's `topics[0]` instead
of trusted from the caller; every log from the registered vault is applied in order; foreign logs
are skipped rather than reverted on; `blockHeight` is threaded through so stale proofs cannot
overwrite newer state. Both attacks were re-run against v3 and both positions liquidated correctly.

Both findings are filed upstream at https://github.com/gluwa/USC-Builder-Examples/issues/37.
`yarn attack` reproduces either one against both managers.

Third defense: the ~10-minute attestation wait is finality protection — Deadswitch never
liquidates on a Sepolia block that could still be reorged away. Full detail in `SECURITY.md`.

## Live on testnet (real transactions)
| Contract | Chain | Address |
|---|---|---|
| **DeadswitchManagerV3** (current) | Creditcoin CC3 | `0x44e2d55Af74f400b97fBC010Acd504A1458bA682` |
| CollateralVault | Sepolia | `0x80366d27b907828A36243140ce6ACED6350EE412` |
| DeadswitchManager v2 (superseded) | Creditcoin CC3 | `0x70FD9432620accb22E015E3929FF948B41aa3BD4` |
| DeadswitchManager v1 (superseded) | Creditcoin CC3 | `0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c` |

- Real positions liquidated by proven cross-chain withdrawals — manually and autonomously by the
  keeper — on v1 `0xe12EEc4c`.
- The forged-event demonstration: `NaiveManager` `0x9EdeA943` liquidated from a forged event;
  Deadswitch rejected the identical proof.
- Both `USCBase` findings executed on live Sepolia and CC3, defeating v2 and failing against v3.

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
MVP: one collateral asset, one source chain, full liquidation + collateral restore. Positions are
owner-registered — there is no lender-matching market. No interest
accrual, no auctions, no matching engine — those are products on top of the primitive. The
submission is the trust-minimized liquidation path and the security work that makes it safe.
