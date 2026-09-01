# Deadswitch 💀

**A loan that dies when its collateral moves on another chain — no bridge, no relayer, no price feed.**

Built for BUIDL CTC 2026 Fall on Creditcoin's Attestcoin Protocol.

## The problem

Cross-chain lending today trusts a middleman with the one thing that matters: knowing whether
the collateral is still there. Bridges get hacked. Oracle committees get bribed. Relayers go
offline. Every existing design puts a trusted party between your collateral (chain A) and your
debt (chain B).

## What Deadswitch does

Collateral sits in a vault on **Sepolia**. The debt position lives on **Creditcoin**. The vault
never blocks a withdrawal — it can't know your debt. What it guarantees instead is that every
withdrawal emits a provable event. When that event drops the collateral below the position's
threshold, **anyone** can prove it to Creditcoin through the Attestcoin oracle, and the position
liquidates in the same transaction the proof verifies.

- **No bridge** — the proof is verified against attested source-chain state by the
  `0x0FD2` precompile, natively in Creditcoin's runtime.
- **No privileged relayer** — proof submission is permissionless. Trust comes from the
  attestation quorum, not the submitter. Our keeper is a convenience, not an authority.
- **No price feed** — the liquidation condition is collateral *quantity*, proven from the
  source chain's own receipts.

## How it works

```
Sepolia                                Creditcoin
┌──────────────────┐                   ┌─────────────────────┐
│ CollateralVault  │                   │ DeadswitchManager   │
│                  │                   │                     │
│ withdraw() ──────┼── emits ──┐       │ execute(proof)      │
│                  │           │       │   └─ verifyAndEmit()│ ← 0x0FD2 precompile
└──────────────────┘           │       │   └─ decode receipt │
                               ▼       │   └─ status == 1 ?  │
                    CollateralWithdrawn│   └─ emitter == vault?
                    (positionId,       │   └─ remaining < min?
                     amount, remaining)│        └─ 💀 LIQUIDATED
                               │       └─────────────────────┘
        attestors attest ──────┘              ▲
        block, continuity proofs        anyone submits the proof
        bridge the gaps                 (keeper = convenience)
```

1. `CollateralVault.withdraw()` emits `CollateralWithdrawn(positionId, amount, remaining)`.
2. Creditcoin's attestor network attests the Sepolia block (checkpoint every N blocks;
   continuity proofs chain the digests between checkpoints).
3. Any observer fetches an inclusion + continuity proof from the proof builder and calls
   `DeadswitchManager.execute()`.
4. The `0x0FD2` precompile verifies the proof **synchronously, in the same transaction**.
5. The manager decodes the receipt, checks it, and liquidates if `remaining < minCollateral`.

## Hardening the 0x0FD2 trust boundary

Gluwa's loan tutorial already teaches emitter authentication and receipt-status checking —
`USCLoanManager.sol:240` and `:267`, added in PR #92 (`4ff9a3b`, 2026-07-29). Deadswitch adopts
all ten of those guards. What it adds is below.

**1. Proof that the emitter guard is load-bearing.** `MaliciousVault` forges a real, provable
`CollateralWithdrawn` for a position it does not own. The identical proof liquidates an unguarded
manager on CC3 and bounces off Deadswitch with `"Event not emitted by registered vault"` — the
executable version of the warning in the tutorial's own comment. `yarn exploit` reproduces it.

**2. Two ways to defeat any manager built on the tutorial's `USCBase` — including Deadswitch v2.**

- **Action-selector suppression.** `USCBase`'s replay key is
  `keccak(chainKey, blockHeight, txIndex)`. It omits `action`, which the *caller* supplies. One
  transaction carrying both a deposit and a withdrawal can be consumed as a deposit; the
  withdrawal is then permanently unprovable. Collateral leaves, the position stays healthy.
- **Decoy-log censorship.** Consumers read `logs[0]` and revert on the emitter check. Prefixing a
  decoy event from a throwaway contract in the same transaction makes the genuine withdrawal
  permanently unprovable — the emitter guard becomes the censorship vector.

Both are demonstrated live (`yarn attack`) and both are fixed in **v3** (`DeadswitchBase.sol`):
the action is derived from each log's own `topics[0]` instead of trusted from the caller, every
log emitted by the registered vault is applied in order, foreign logs are skipped rather than
reverted on, and `blockHeight` is threaded through so stale proofs cannot overwrite newer state.

## Why the ~10 minute wait is a feature

Sepolia events become provable ~8–10 minutes after inclusion, because attestors wait out
source-chain reversion risk before attesting. This is the right trade: a liquidation that fires
on an unfinalized block can be *un-happened* by a reorg — leaving a dead position on Creditcoin
whose triggering withdrawal no longer exists. Deadswitch never acts on a block that can still
be reorged away. Attestations reach quorum only when honest attestors — each following the
canonical chain via independent RPCs — compute identical digests; a malicious attestor's forged
block changes every subsequent digest and can never reach quorum.

## Live deployment (testnets)

| Contract | Chain | Address |
|---|---|---|
| **DeadswitchManagerV3** (current) | Creditcoin CC3 | `0x44e2d55Af74f400b97fBC010Acd504A1458bA682` |
| CollateralVault | Sepolia | `0x80366d27b907828A36243140ce6ACED6350EE412` |
| TestERC20 (TST) | Sepolia | `0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c` |
| EvmV1Decoder lib | Creditcoin CC3 | `0x60b70BC2E774d7A781138009A28B2917893dc98A` |

Superseded, kept so the security demos stay reproducible:

| Contract | Chain | Address | Why it still exists |
|---|---|---|---|
| DeadswitchManager v2 | Creditcoin CC3 | `0x70FD9432620accb22E015E3929FF948B41aa3BD4` | inherits the tutorial's `USCBase`; the contract the attack demos defeat |
| DeadswitchManager v1 | Creditcoin CC3 | `0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c` | carries the first two live liquidations |

The four current CC3 contracts (v3, v2, NaiveManager, EvmV1Decoder) are **source-verified on
Blockscout**, so every event below decodes publicly. v1 is left unverified deliberately: its
bytecode predates the deposit path later added to `DeadswitchManager.sol`, so the current source
no longer matches it.

Headline proof — position #3, liquidated autonomously by the permissionless keeper on the current
v3 contract: 60 TST withdrawn on Sepolia, 40 TST attested against a 50 TST threshold.
[`0xd149012c…`](https://creditcoin-testnet.blockscout.com/tx/0xd149012c274f0bf1b937a3171d591a4371635749075dce1bd1a255f440eb78d6) decodes to `CollateralAttested(3, 40.0)` and
`PositionLiquidated(3, 40.0, 50.0)`.

Earlier proven kill: withdrawal [`0x8758…4b10`](https://sepolia.etherscan.io/tx/0x87585c3b4d832d8519220cfe8da89a924500da931537bbff04e01c7b20784b10)
(100 → 40 TST, threshold 50) → proof submitted → `PositionLiquidated(1, 40e18, 50e18)`.

## Frontend

Two routes, one Next.js 15 app (App Router, static export):

| Route | What it is |
|---|---|
| `/` | Overview: mechanism, findings, evidence ledger |
| `/app` | Live console — reads Creditcoin CC3 and Sepolia directly, connects a wallet via RainbowKit, and submits Attestcoin proofs |

```sh
cd web-next && npm install && npm run build   # -> web-next/out, mirrored into docs/ for GitHub Pages
```

Live at https://nuel-osas.github.io/deadswitch/ — no backend, no indexer. The console talks to the
public RPCs and the Attestcoin prover from the browser.

## Run it

```sh
yarn install && forge build
cp .env.example .env   # add CREDITCOIN_WALLET_PRIVATE_KEY (testnet-only key)
yarn server            # demo UI + permissionless keeper on http://localhost:4020
```

The UI shows both chains side by side: withdraw collateral on Sepolia in one pane and watch
the position die on Creditcoin in the other, with the attestation progress visible between.

CLI alternative: `yarn liquidate <withdrawal_tx_hash>`.

## Scope

MVP scope, deliberately: one collateral asset, one source chain, full liquidation only. No
interest accrual, no auctions, no lending market — those are products on top. The submission
is the trust-minimized liquidation path. In production, the vault's withdraw path would gate on
a debt attestation flowing the *other* way (Creditcoin → Sepolia via Attestcoin writability),
closing the loop without ever adding a bridge.
