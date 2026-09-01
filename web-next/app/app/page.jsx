'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount, useChainId, usePublicClient, useReadContract,
  useSwitchChain, useWalletClient,
} from 'wagmi';
import { createPublicClient, formatEther, http } from 'viem';
import { sepolia } from 'wagmi/chains';
import {
  CHAIN_KEY, CONTRACTS, MANAGER_ABI, POSITION_ID, PROVER, SEPOLIA_RPC, VAULT_ABI, creditcoinCC3,
} from '../chain';

const sepoliaClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
const STATUS = ['Active', 'Liquidated', 'Closed'];

const EXAMPLES = [
  ['Finding A source tx', '0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3'],
  ['Finding B source tx', '0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3'],
  ['Position #3 withdrawal', '0x6b17a76246f2623f34920d6ee628ca5e7a453527ef0ca359f89212f5555257ae'],
];

const fmt = (v) => (v == null ? '—' : Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const short = (a) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '—');

export default function Console() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: creditcoinCC3.id });

  const [vault, setVault] = useState(null);
  const [attested, setAttested] = useState(null);
  const [txhash, setTxhash] = useState('');
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState([{ kind: 'info', msg: 'Reading live state from Creditcoin CC3 and Sepolia…' }]);

  const log = useCallback((msg, kind = 'info') => {
    setFeed((f) => [...f.slice(-60), { kind, msg, t: new Date().toLocaleTimeString() }]);
  }, []);

  const { data: position, refetch: refetchPosition } = useReadContract({
    address: CONTRACTS.manager, abi: MANAGER_ABI, functionName: 'debtPositions',
    args: [POSITION_ID], chainId: creditcoinCC3.id,
    query: { refetchInterval: 15000 },
  });

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const v = await sepoliaClient.readContract({
          address: CONTRACTS.vault, abi: VAULT_ABI, functionName: 'positions', args: [POSITION_ID],
        });
        if (alive) setVault(v);
      } catch { /* transient rpc */ }
      try {
        const r = await fetch(`${PROVER}/api/v1/attested-height/${CHAIN_KEY}`);
        const j = await r.json();
        if (alive) setAttested(j.attestedHeight);
      } catch { /* transient */ }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const wrongNetwork = isConnected && chainId !== creditcoinCC3.id;

  const submit = async () => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txhash.trim())) { log('Enter a valid 32-byte transaction hash.', 'err'); return; }
    if (!walletClient) { log('Connect a wallet first.', 'err'); return; }
    if (wrongNetwork) { log(`Wrong network. Switch to ${creditcoinCC3.name} (chain ${creditcoinCC3.id}).`, 'err'); return; }

    setBusy(true);
    try {
      log(`Fetching inclusion + continuity proof for ${txhash.slice(0, 12)}… from the Attestcoin prover`, 'step');
      const res = await fetch(`${PROVER}/api/v1/proof-by-tx/${CHAIN_KEY}/${txhash.trim()}`);
      if (!res.ok) throw new Error(`prover returned ${res.status} — the Sepolia block may not be attested yet (~8-10 min)`);
      const p = await res.json();
      log(`Proof received. Sepolia block ${p.headerNumber}, ${p.merkleProof.siblings.length} merkle siblings, ${p.continuityProof.roots.length} continuity roots.`, 'ok');

      const siblings = p.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft }));
      log(`Submitting to DeadswitchManagerV3.execute() on ${creditcoinCC3.name} (chain ${creditcoinCC3.id}) — the 0x0FD2 precompile verifies it in this same transaction`, 'step');

      const hash = await walletClient.writeContract({
        address: CONTRACTS.manager, abi: MANAGER_ABI, functionName: 'execute',
        args: [BigInt(p.chainKey), BigInt(p.headerNumber), p.txBytes, p.merkleProof.root,
          siblings, p.continuityProof.lowerEndpointDigest, p.continuityProof.roots],
        chain: creditcoinCC3, gas: 3_000_000n,
      });
      log(`Sent: ${hash}`, 'step');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let changed = false;
      for (const l of receipt.logs) {
        try {
          const { decodeEventLog } = await import('viem');
          const ev = decodeEventLog({ abi: MANAGER_ABI, data: l.data, topics: l.topics });
          if (ev.eventName === 'PositionLiquidated') {
            changed = true;
            log(`PositionLiquidated(#${ev.args.positionId}): ${fmt(ev.args.remainingCollateral)} < ${fmt(ev.args.minCollateral)}`, 'kill');
          } else if (ev.eventName === 'CollateralAttested') {
            log(`CollateralAttested(#${ev.args.positionId}): remaining ${fmt(ev.args.remaining)}`, 'ok');
          } else if (ev.eventName === 'PositionRestored') {
            changed = true;
            log(`PositionRestored(#${ev.args.positionId}): ${fmt(ev.args.remainingCollateral)} >= ${fmt(ev.args.minCollateral)}`, 'ok');
          }
        } catch { /* not one of ours */ }
      }
      log(`Mined — ${creditcoinCC3.blockExplorers.default.url}/tx/${hash}`, 'ok');
      if (!changed) log('No position state changed: the proven transaction touched no registered position.', 'info');
      refetchPosition();
    } catch (e) {
      const m = e?.shortMessage || e?.details || e?.message || String(e);
      log(`Failed: ${m}`, 'err');
      if (/already processed/i.test(m)) log('That is the replay guard working: one source transaction can be proven exactly once.', 'info');
    } finally {
      setBusy(false);
    }
  };

  const st = position ? Number(position[5]) : null;

  return (
    <>
      <nav className="nav">
        <div className="wrap nav-in">
          <a className="brand" href="/deadswitch/">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1.5" y="1.5" width="19" height="19" fill="none" stroke="#ff3b41" strokeWidth="1.5" />
              <path d="M6 11h10M11 6v10" stroke="#ff3b41" strokeWidth="1.5" />
            </svg>
            Deadswitch
          </a>
          <div className="nav-right">
            <span className="chip">
              <span className="dot" /> CC3 · chain {creditcoinCC3.id}
            </span>
            <ConnectButton showBalance={false} chainStatus="full" accountStatus="address" />
          </div>
        </div>
      </nav>

      <main>
        <div className="wrap head">
          <a className="back" href="/deadswitch/">← Back to overview</a>
          <h1>Live console</h1>
          <p>
            State read straight from Creditcoin CC3 and Ethereum Sepolia — no backend, no indexer.
            Proof submission is permissionless, so you can liquidate a position yourself with your own wallet.
          </p>
        </div>

        {wrongNetwork && (
          <div className="wrap">
            <div className="banner">
              <span>
                Wrong network. Deadswitch lives on <b>{creditcoinCC3.name}</b> (chain ID <code>{creditcoinCC3.id}</code>,
                native currency <code>{creditcoinCC3.nativeCurrency.symbol}</code>).
              </span>
              <button className="btn btn--accent" onClick={() => switchChain({ chainId: creditcoinCC3.id })}>
                Switch network
              </button>
            </div>
          </div>
        )}

        <div className="wrap cols">
          <section className="card">
            <div className="card__head">
              <h2>Collateral vault</h2>
              <span className="chip">Sepolia · chain {sepolia.id}</span>
            </div>
            <div className="card__body">
              <span className="lbl">Collateral remaining</span>
              <div className="metric">{vault ? fmt(vault[2]) : '—'}<span className="u">TST</span></div>
              <dl className="rows">
                <div className="row"><dt>Position</dt><dd>#{String(POSITION_ID)}</dd></div>
                <div className="row"><dt>Owner</dt><dd>{short(vault?.[0])}</dd></div>
                <div className="row"><dt>Withdrawals</dt><dd>never blocked, always logged</dd></div>
              </dl>
              <p className="addr">
                Vault <a href={`https://sepolia.etherscan.io/address/${CONTRACTS.vault}`} target="_blank" rel="noreferrer">{CONTRACTS.vault}</a>
              </p>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Debt position</h2>
              <span className="chip">Creditcoin CC3 · chain {creditcoinCC3.id}</span>
            </div>
            <div className="card__body">
              <span className="lbl">Position status</span>
              <div className={`metric ${st === 1 ? 'dead' : st === 0 ? 'ok' : ''}`}>{st == null ? '—' : STATUS[st]}</div>
              <dl className="rows">
                <div className="row"><dt>Debt</dt><dd>{fmt(position?.[1])} TST</dd></div>
                <div className="row"><dt>Liquidation threshold</dt><dd>{fmt(position?.[2])} TST</dd></div>
                <div className="row">
                  <dt>Last attested collateral</dt>
                  <dd className={position && position[3] !== 0n && position[3] < position[2] ? 'danger' : ''}>
                    {position && position[3] === 0n ? 'never attested' : `${fmt(position?.[3])} TST`}
                  </dd>
                </div>
                <div className="row"><dt>Last attested block</dt><dd>{position ? String(position[4]) : '—'}</dd></div>
              </dl>
              <p className="addr">
                Manager v3 <a href={`${creditcoinCC3.blockExplorers.default.url}/address/${CONTRACTS.manager}`} target="_blank" rel="noreferrer">{CONTRACTS.manager}</a> · verified
              </p>
            </div>
          </section>
        </div>

        <div className="wrap keeper">
          <section className="card">
            <div className="card__head">
              <h2>Be the keeper</h2>
              <span className="chip">attested height {attested ?? '—'}</span>
            </div>
            <div className="card__body">
              <p className="hint">
                Anyone can prove a Sepolia event to Creditcoin — there is no privileged relayer. Paste a{' '}
                <code>CollateralWithdrawn</code> transaction hash from the vault. This page fetches its inclusion and
                continuity proof from the Attestcoin prover and submits it to <code>DeadswitchManagerV3.execute()</code>{' '}
                with your wallet. If the attested collateral is below the threshold, the position liquidates in the same
                transaction that verifies the proof.
              </p>
              <div className="field">
                <input
                  type="text" value={txhash} onChange={(e) => setTxhash(e.target.value)}
                  placeholder="0x… Sepolia CollateralWithdrawn transaction" spellCheck={false}
                  aria-label="Sepolia transaction hash"
                />
                <button className="btn btn--accent" onClick={submit} disabled={busy || !isConnected}>
                  {busy ? 'Working…' : isConnected ? 'Fetch proof & submit' : 'Connect a wallet'}
                </button>
              </div>
              <div className="presets">
                {EXAMPLES.map(([label, h]) => (
                  <button key={h} className="preset" type="button" onClick={() => { setTxhash(h); log(`Loaded ${label}`); }}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="log" role="log" aria-live="polite">
                {feed.map((f, i) => (
                  <div key={i}><span className="t">{f.t ?? '—'}</span><span className={`k-${f.kind}`}>{f.msg}</span></div>
                ))}
              </div>

              <p className="note">
                Signing happens on <b>{creditcoinCC3.name}</b>, chain ID <code>{creditcoinCC3.id}</code>, gas paid in{' '}
                <code>{creditcoinCC3.nativeCurrency.symbol}</code>. A transaction can be proven only once — the replay
                guard rejects repeats with <code>Query already processed</code>. The examples above are already consumed,
                so they revert; that revert is the guard working. To liquidate something live, use a fresh withdrawal.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="wrap">
          Deadswitch — testnet only, nothing here holds real value.{' '}
          <a href="/deadswitch/">Overview</a> ·{' '}
          <a href="https://github.com/Nuel-osas/deadswitch">GitHub</a> ·{' '}
          <a href={`${creditcoinCC3.blockExplorers.default.url}/address/${CONTRACTS.manager}`}>Manager on Blockscout</a>
        </div>
      </footer>
    </>
  );
}
