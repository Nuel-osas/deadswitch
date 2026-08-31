import dotenv from 'dotenv';
import http from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Contract, ethers, InterfaceAbi } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';

import managerAbi from '../abi/DeadswitchManagerV3.json';

dotenv.config({ override: true });

const VAULT_ABI = [
  'function positions(uint256) view returns (address owner, address token, uint256 balance, bool exists)',
  'function withdraw(uint256 positionId, uint256 amount)',
  'function deposit(uint256 positionId, uint256 amount)',
  'function openPosition(uint256 positionId, address token, uint256 amount)',
  'event CollateralWithdrawn(uint256 indexed positionId, uint256 amount, uint256 remaining)',
  'event CollateralDeposited(uint256 indexed positionId, address indexed owner, uint256 amount, uint256 remaining)',
];

const REQUIRED = [
  'SOURCE_CHAIN_KEY', 'PROOF_BUILDER_URL', 'CREDITCOIN_RPC_URL', 'SOURCE_CHAIN_RPC_URL',
  'CREDITCOIN_WALLET_PRIVATE_KEY', 'DEADSWITCH_MANAGER_V3_ADDRESS', 'COLLATERAL_VAULT_ADDRESS',
  'TEST_TOKEN_ADDRESS',
];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\nMissing required env vars: ${missing.join(', ')}\nCopy .env.example to .env and fill in CREDITCOIN_WALLET_PRIVATE_KEY.\n`);
  process.exit(1);
}

const chainKey = Number(process.env.SOURCE_CHAIN_KEY);
const ccProvider = new ethers.JsonRpcProvider(process.env.CREDITCOIN_RPC_URL);
const srcProvider = new ethers.JsonRpcProvider(process.env.SOURCE_CHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.CREDITCOIN_WALLET_PRIVATE_KEY!, srcProvider);
const ccWallet = new ethers.Wallet(process.env.CREDITCOIN_WALLET_PRIVATE_KEY!, ccProvider);

const vault = new Contract(process.env.COLLATERAL_VAULT_ADDRESS!, VAULT_ABI, wallet);
const manager = new Contract(process.env.DEADSWITCH_MANAGER_V3_ADDRESS!, managerAbi as InterfaceAbi, ccWallet);
const info = new chainInfo.PrecompileChainInfoProvider(ccProvider);
const proofBuilder = new proofProvider.service.ProofBuilder(chainKey, process.env.PROOF_BUILDER_URL!);

const POSITION_ID = Number(process.env.POSITION_ID ?? 1);

// ---- keeper state, mirrored into the UI event feed ----
type FeedEntry = { t: number; msg: string; kind: string };
const feed: FeedEntry[] = [];
const log = (msg: string, kind = 'info') => {
  feed.push({ t: Date.now(), msg, kind });
  if (feed.length > 200) feed.shift();
  console.log(`[${kind}] ${msg}`);
};

let pendingProof: { txHash: string; block: number } | null = null;

// Permissionless keeper: watch the vault, prove every withdrawal, submit.
// Anyone on the internet could run this loop — that is the point.
async function keeper(txHash: string, block: number, _action: number, kind: string) {
  pendingProof = { txHash, block };
  log(`${kind} ${txHash.slice(0, 10)}… in Sepolia block ${block}. Waiting for attestation…`, 'wait');
  try {
    // Prover-service polls can time out transiently; a keeper must survive that.
    for (let attempt = 1; ; attempt++) {
      try {
        await proofBuilder.waitUntilHeightAttested(chainKey, block, 15_000, 1_200_000);
        break;
      } catch (e: any) {
        if (attempt >= 5) throw e;
        log(`Attestation poll failed (attempt ${attempt}/5), retrying in 30s: ${e.message ?? e}`, 'wait');
        await new Promise((r) => setTimeout(r, 30_000));
      }
    }
    log(`Block ${block} attested. Generating proof…`, 'proof');
    const proofRes = await proofBuilder.getProof(txHash);
    if (!proofRes.success) throw new Error(`Proof generation failed: ${proofRes.error}`);
    const proof = proofRes.data!;
    log('Proof generated. Submitting to DeadswitchManager.execute…', 'proof');
    // v3 derives the action from the logs themselves — no caller-supplied selector.
    const tx = await manager.execute(
      proof.chainKey, proof.headerNumber, proof.txBytes,
      proof.merkleProof.root, proof.merkleProof.siblings,
      proof.continuityProof.lowerEndpointDigest, proof.continuityProof.roots,
      { gasLimit: 2_000_000 }
    );
    const receipt = await tx.wait();
    for (const l of receipt!.logs) {
      try {
        const parsed = manager.interface.parseLog(l);
        if (parsed?.name === 'PositionLiquidated') {
          log(`PositionLiquidated: remaining ${ethers.formatEther(parsed.args[1])} < min ${ethers.formatEther(parsed.args[2])}`, 'kill');
        } else if (parsed?.name === 'PositionRestored') {
          log(`PositionRestored: collateral ${ethers.formatEther(parsed.args[1])} >= min ${ethers.formatEther(parsed.args[2])}`, 'done');
        } else if (parsed) {
          log(`Event: ${parsed.name}`, 'event');
        }
      } catch { /* not ours */ }
    }
    log(`Proof mined on Creditcoin: ${tx.hash.slice(0, 10)}…`, 'done');
  } catch (e: any) {
    log(`Keeper error: ${e.message ?? e}`, 'error');
  } finally {
    pendingProof = null;
  }
}

// Poll for CollateralWithdrawn via eth_getLogs — more reliable than provider
// event subscriptions on public RPCs.
let lastScanned = 0;
const seenTxs = new Set<string>();
async function scanWithdrawals() {
  try {
    const head = await srcProvider.getBlockNumber();
    if (lastScanned === 0) lastScanned = Number(process.env.RESCAN_FROM ?? 0) || head;
    if (head <= lastScanned) return;
    const [wds, deps] = await Promise.all([
      vault.queryFilter(vault.filters.CollateralWithdrawn(), lastScanned + 1, head),
      vault.queryFilter(vault.filters.CollateralDeposited(), lastScanned + 1, head),
    ]);
    lastScanned = head;
    for (const ev of wds) {
      if (seenTxs.has(ev.transactionHash)) continue;
      seenTxs.add(ev.transactionHash);
      const a = (ev as ethers.EventLog).args!;
      log(`CollateralWithdrawn(#${a[0]}): -${ethers.formatEther(a[1])}, remaining ${ethers.formatEther(a[2])}`, 'event');
      keeper(ev.transactionHash, ev.blockNumber, 0, 'Withdrawal');
    }
    for (const ev of deps) {
      if (seenTxs.has(ev.transactionHash)) continue;
      seenTxs.add(ev.transactionHash);
      const a = (ev as ethers.EventLog).args!;
      // openPosition also emits CollateralDeposited; only chase top-ups (position already known on CC)
      log(`CollateralDeposited(#${a[0]}): +${ethers.formatEther(a[2])}, remaining ${ethers.formatEther(a[3])}`, 'event');
      keeper(ev.transactionHash, ev.blockNumber, 1, 'Deposit');
    }
  } catch (e: any) {
    // transient RPC failure; retry next tick
  }
}
setInterval(scanWithdrawals, 8_000);

async function status() {
  const [pos, debt, attested, srcBlock] = await Promise.all([
    vault.positions(POSITION_ID),
    manager.debtPositions(POSITION_ID),
    info.getLatestAttestedHeightAndHash(chainKey).catch(() => ({ height: 0 })),
    srcProvider.getBlockNumber(),
  ]);
  return {
    vault: { owner: pos.owner, balance: pos.balance.toString(), exists: pos.exists },
    position: {
      borrower: debt.borrower,
      debt: debt.debt.toString(),
      minCollateral: debt.minCollateral.toString(),
      lastAttested: debt.lastAttestedCollateral.toString(),
      status: Number(debt.status), // 0 Active, 1 Liquidated, 2 Closed
    },
    attestation: {
      latestAttestedHeight: Number(attested.height),
      sourceHeight: srcBlock,
      pending: pendingProof,
    },
    positionId: POSITION_ID,
    addresses: {
      vault: process.env.COLLATERAL_VAULT_ADDRESS,
      manager: process.env.DEADSWITCH_MANAGER_V3_ADDRESS,
    },
    feed,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/status') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(await status()));
    } else if (req.url === '/api/withdraw' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const { amount } = JSON.parse(body || '{}');
          const wei = ethers.parseEther(String(amount ?? '10'));
          log(`Withdrawing ${amount ?? '10'} TST from vault on Sepolia…`, 'action');
          const tx = await vault.withdraw(POSITION_ID, wei);
          await tx.wait();
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ txHash: tx.hash }));
        } catch (e: any) {
          log(`Withdraw failed: ${e.shortMessage ?? e.message}`, 'error');
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: e.shortMessage ?? e.message }));
        }
      });
    } else if (req.url === '/api/deposit' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const { amount } = JSON.parse(body || '{}');
          const wei = ethers.parseEther(String(amount ?? '20'));
          const token = new Contract(process.env.TEST_TOKEN_ADDRESS!, ['function approve(address,uint256)'], wallet);
          await (await token.approve(process.env.COLLATERAL_VAULT_ADDRESS!, wei)).wait();
          log(`Depositing ${amount ?? '20'} TST to rescue position…`, 'action');
          const tx = await vault.deposit(POSITION_ID, wei);
          await tx.wait();
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ txHash: tx.hash }));
        } catch (e: any) {
          log(`Deposit failed: ${e.shortMessage ?? e.message}`, 'error');
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: e.shortMessage ?? e.message }));
        }
      });
    } else {
      // Serve only from an explicit allowlist. A naive join() here is a path
      // traversal: `curl --path-as-is /../.env` would serve the private key.
      const ALLOWED: Record<string, string> = { '/': 'index.html', '/index.html': 'index.html' };
      const file = ALLOWED[(req.url ?? '/').split('?')[0]];
      let body: Buffer;
      try {
        if (!file) throw new Error('not allowed');
        body = readFileSync(join(__dirname, '..', 'web', file));
      } catch {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(body);
    }
  } catch (e) {
    if (!res.headersSent) res.writeHead(500);
    res.end('error');
  }
});

// Bind loopback only: /api/withdraw and /api/deposit sign with a live key and
// are unauthenticated. Never expose this process to a network interface.
server.listen(4020, '127.0.0.1', () => log('Deadswitch demo server on http://127.0.0.1:4020', 'info'));
