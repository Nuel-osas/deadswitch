# Demo video: shot list and narration

**Target: 2 minutes 30. One take per section, cut between sections.**
**Record at 1920x1080. Terminal font 18pt minimum, dark theme.**

The cold open is the finding, not the architecture. A judge who has seen a dozen
loan forks today needs to know in ten seconds that this one is different.

---

## Before you hit record

Run `bash demo/stage.sh` once. It checks that:
- position #4 is Active with 100 TST (the live kill target)
- the attack transcripts are ready to replay
- the site and console are reachable

Open these, in this order, as separate windows:
1. Terminal, in the repo, full screen
2. `contracts/USCBase.sol` in an editor, scrolled to line 80
3. https://nuel-osas.github.io/deadswitch/
4. https://nuel-osas.github.io/deadswitch/app/
5. Blockscout: the position #3 transaction

---

## 0:00 – 0:18 · Cold open. The finding.

**Screen:** `contracts/USCBase.sol`, lines 80-86 visible. The assembly block.

> "This is the replay key in Creditcoin's example base contract. It hashes the
> chain, the block height, and the transaction index. It does not hash `action`.
> And `action` is supplied by whoever submits the proof."

Pause one beat on the line. Do not explain the project yet.

---

## 0:18 – 0:55 · The attack, live.

**Screen:** terminal. Run:

    yarn attack suppression 0xeb9bc78f706469f41f175cac35ddb84740e99511cd76b75ed64d40b314372ce1 300

> "So I put a deposit and a withdrawal in one Sepolia transaction, and submitted
> it as a deposit."

**On screen:** `accepted. attested collateral = 100.000000000000000001, status = ACTIVE`

> "The manager recorded a hundred tokens of collateral and marked the position
> active. Now anyone tries to prove the withdrawal that was in the same
> transaction."

**On screen:** `REVERTED: "Query already processed"`

> "The collateral is gone. The position reports healthy. Permanently. There is no
> second chance to prove it, because the query was already consumed."

---

## 0:55 – 1:15 · The fix.

**Screen:** same terminal, the v3 half of the same output.

> "Version three derives the action from each log's own topic instead of trusting
> the caller, and applies every log in the transaction in order."

**On screen:** `CollateralAttested(300, 100.000…001)` → `CollateralAttested(300, 1 wei)` → `PositionLiquidated`

> "Same proof. Same transaction. The withdrawal is seen, and the position dies."

---

## 1:15 – 1:40 · What it is.

**Screen:** the landing page hero. Let the liquidation animation play once.

> "That base contract is the foundation of Deadswitch. Collateral sits in a vault
> on Ethereum. The debt lives on Creditcoin. The vault never blocks a withdrawal,
> because it cannot know the debt — it only guarantees the withdrawal is provable.
> When the proven collateral falls below the threshold, anyone can prove it, and
> the position liquidates in the same transaction that verifies the proof.
> No bridge. No relayer. No price feed."

---

## 1:40 – 2:10 · The real kill.

**Screen:** the hosted console, position #4 showing 100 TST and ACTIVE.

> "This position is live on testnet right now. A hundred tokens of collateral
> against a fifty token threshold."

Click **withdraw 60**.

> "Withdrawing sixty leaves forty, which is under the threshold."

**CUT — and say so on camera.**

> "Attestation takes about nine minutes. That wait is the finality guarantee, not
> lag: a liquidation fired on a block that could still be reorged could be
> un-happened. Cutting forward."

**Screen:** the console after the keeper fires.

> "The keeper proved it and the position is liquidated. Nobody privileged did
> that — proof submission is permissionless."

---

## 2:10 – 2:30 · Close on evidence.

**Screen:** Blockscout, the decoded events.

> "Every contract is verified, so every event decodes publicly.
> `CollateralAttested`, then `PositionLiquidated`.
> Both flaws I showed you are filed upstream as issue thirty-seven on Gluwa's
> examples repo, and both are fixed in the base contract this runs on."

**Last frame:** the title card. Hold three seconds.

---

## Rules

- Never say "instant" or "immediately". It takes nine minutes and the judges built
  the nine minutes.
- Declare every cut out loud. An undeclared cut around a latency wait reads as
  hiding something.
- Do not read the architecture diagram aloud. It is on the site if they want it.
- If a command fails on camera, keep the take and say what failed. It is a testnet.
