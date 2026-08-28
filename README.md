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

## The two checks that matter

**Receipt status.** The precompile proves a transaction was *included* — not that it
*succeeded*. A reverted withdrawal still has a valid inclusion proof. Deadswitch requires
`receipt.receiptStatus == 1`, otherwise a failed withdrawal could liquidate a healthy position.

**Emitter address.** Anyone can deploy a contract that emits `CollateralWithdrawn` with your
positionId and prove it faithfully — the event is real, the contract is a lie. Deadswitch
accepts events only from the registered vault address.

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
| CollateralVault | Sepolia | `0x80366d27b907828A36243140ce6ACED6350EE412` |
| TestERC20 (TST) | Sepolia | `0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c` |
| DeadswitchManager | Creditcoin CC3 | `0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c` |
| EvmV1Decoder lib | Creditcoin CC3 | `0x60b70BC2E774d7A781138009A28B2917893dc98A` |

Proven kill, on-chain: withdrawal [`0x8758…4b10`](https://sepolia.etherscan.io/tx/0x87585c3b4d832d8519220cfe8da89a924500da931537bbff04e01c7b20784b10)
(100 → 40 TST, threshold 50) → proof submitted → `PositionLiquidated(1, 40e18, 50e18)`.

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
