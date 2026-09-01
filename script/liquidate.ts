import dotenv from 'dotenv';
import { Contract, ethers, InterfaceAbi } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';

import managerAbi from '../abi/DeadswitchManagerV3.json';
import { CORE, requireEnv } from './env';

dotenv.config({ override: true });

requireEnv([...CORE, 'DEADSWITCH_MANAGER_V3_ADDRESS']);

// Deadswitch liquidation submitter (CLI).
// Usage: yarn liquidate <withdrawal_tx_hash>
// Proves a CollateralWithdrawn event from the Sepolia vault via the Attestcoin
// oracle and submits it to DeadswitchManagerV3.execute(). Permissionless:
// any observer can run this — trust comes from the attestation quorum.
async function main() {
  const [txHash] = process.argv.slice(2);
  if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
    console.error('Usage: yarn liquidate <withdrawal_tx_hash>');
    process.exit(1);
  }

  const chainKey = Number(process.env.SOURCE_CHAIN_KEY);
  const ccProvider = new ethers.JsonRpcProvider(process.env.CREDITCOIN_RPC_URL);
  const srcProvider = new ethers.JsonRpcProvider(process.env.SOURCE_CHAIN_RPC_URL);

  const transaction = await srcProvider.getTransaction(txHash);
  if (!transaction?.blockNumber) throw new Error(`Transaction ${txHash} not found/mined on source chain`);
  const blockNumber = transaction.blockNumber;
  console.log(`Transaction found in block ${blockNumber}`);

  const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, process.env.PROOF_BUILDER_URL!);
  const infoProvider = new chainInfo.PrecompileChainInfoProvider(ccProvider);
  const latest = await infoProvider.getLatestAttestedHeightAndHash(chainKey);
  console.log(`Latest attested height: ${latest.height}. Waiting for ${blockNumber}…`);
  await proofBuilder.waitUntilHeightAttested(chainKey, blockNumber, 15_000, 1_200_000);

  console.log('Attested! Generating proof…');
  const r = await proofBuilder.getProof(txHash);
  if (!r.success) throw new Error(`Proof generation failed: ${r.error}`);
  const p = r.data!;

  const wallet = new ethers.Wallet(process.env.CREDITCOIN_WALLET_PRIVATE_KEY!, ccProvider);
  const manager = new Contract(process.env.DEADSWITCH_MANAGER_V3_ADDRESS!, managerAbi as InterfaceAbi, wallet);

  console.log('Submitting proof to DeadswitchManagerV3.execute()…');
  // v3 derives the action from the logs themselves — no caller-supplied selector.
  const tx = await manager.execute(
    p.chainKey, p.headerNumber, p.txBytes,
    p.merkleProof.root, p.merkleProof.siblings,
    p.continuityProof.lowerEndpointDigest, p.continuityProof.roots,
    { gasLimit: 2_000_000 }
  );
  console.log('Submitted:', tx.hash);
  const receipt = await tx.wait();
  console.log('Mined, status:', receipt!.status);
  for (const l of receipt!.logs) {
    try {
      const parsed = manager.interface.parseLog(l);
      if (parsed) console.log(`Event: ${parsed.name}`, parsed.args.map(String).join(', '));
    } catch { /* not ours */ }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
