import LandingEnhancements from './LandingEnhancements';
import Mark from './Mark';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="shell-nav">
        <div className="shell-nav__in">
          <a className="brand" href="#top">
            <Mark className="brand__mark" size={26} />
            <span className="brand__type">Dead<b>switch</b></span>
          </a>

          <nav className="nav-links" aria-label="Sections">
            <a className="nav-links__anchor" href="#mechanism" data-spy="mechanism">Mechanism</a>
            <a className="nav-links__anchor" href="#finding-a" data-spy="finding-a">Findings</a>
            <a className="nav-links__anchor" href="#evidence" data-spy="evidence">Evidence</a>
            <a className="nav-links__anchor" href="#retraction" data-spy="retraction">Retraction</a>
            <a className="nav-links__anchor" href="#run-it" data-spy="run-it">Run it</a>
          </nav>

          <div className="shell-nav__actions">
            <span className="chip chip--live"><span className="chip__dot"></span>v3 deployed on CC3</span>
            <a className="btn btn--primary btn--sm" href="app/">Launch app</a>
            <details className="nav-menu">
              <summary aria-label="Sections"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></summary>
              <div className="nav-menu__panel">
                <a href="#mechanism">Mechanism</a>
                <a href="#finding-a">Findings</a>
                <a href="#evidence">Evidence</a>
                <a href="#retraction">Retraction</a>
                <a href="#run-it">Run it</a>
                <a href="app/">Launch app</a>
                <a href="https://github.com/Nuel-osas/deadswitch">Open the repo</a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main">

        {/* ============ HERO ============ */}
        <section className="hero wrap" aria-labelledby="hero-h">
          <h1 id="hero-h">The position dies when the collateral leaves.</h1>
          <p className="lead hero__sub">Collateral on Ethereum, debt on Creditcoin. Proven by an Attestcoin receipt from the source chain. No bridge, no relayer, no price feed.</p>
          <p className="hero__note">Provable 8 to 10 minutes after inclusion, once the Sepolia block can no longer be reorged: the finality guarantee, not lag. Liquidation is a state transition and nothing settles, by design: no seizure, no transfer, no auction.</p>

          <div className="hero__cta">
            <a className="btn btn--primary" href="app/">Launch app</a>
            <a className="btn btn--secondary" href="#finding-a">Read the findings</a>
            <a className="btn btn--secondary" href="https://github.com/Nuel-osas/deadswitch">Open the repo</a>
          </div>

          <div className="panel panel--lit hero__panel">
            <div className="panel__head">
              <span>Recorded reading, position #3</span>
              <span className="id">0x44e2&#8230;bA682</span>
            </div>

            <div className="stat-row stat-row--bare">
              <div className="stat">
                <span className="stat__label">Collateral before</span>
                <span className="stat__value">100<span className="unit">TST</span></span>
              </div>
              <div className="stat">
                <span className="stat__label">Withdrawn on Sepolia</span>
                <span className="stat__value">60<span className="unit">TST</span></span>
              </div>
              <div className="stat">
                <span className="stat__label">Attested collateral</span>
                <span className="stat__value">40<span className="unit">TST</span></span>
              </div>
              <div className="stat">
                <span className="stat__label">Liquidation threshold</span>
                <span className="stat__value">50<span className="unit">TST</span></span>
              </div>
              <div className="stat">
                <span className="stat__label">Position status</span>
                <span className="stat__value stat__value--state stat__value--dead">Liquidated</span>
              </div>
            </div>

            <div className="panel__foot">
              <p>Position #3, liquidated by the permissionless keeper with no human in the loop: 60 TST withdrawn on Sepolia, 40 TST attested against a 50 TST threshold. The vault never blocked the withdrawal. It logged it.</p>
              <p className="verify-line">Verify on Creditcoin: <a href="https://creditcoin-testnet.blockscout.com/tx/0xd149012c274f0bf1b937a3171d591a4371635749075dce1bd1a255f440eb78d6"><code>0xd149012c&#8230;</code></a>. Decoded <code>CollateralAttested(3, 40.0)</code> and <code>PositionLiquidated(3, 40.0, 50.0)</code> on the verified v3 contract. A recorded reading, not a live feed.</p>
            </div>
          </div>

          <p className="hero__note">Below: two structural flaws in the tutorial's <code>USCBase</code>, both reproducible from a clone, and one claim of our own that we retracted after checking it. Ten contracts on public testnets, four source-verified on Blockscout, four cause-and-effect transactions: <a className="link" href="#evidence">Evidence</a>.</p>
        </section>

        {/* ============ 1. MECHANISM ============ */}
        <section id="mechanism" className="section" aria-labelledby="mech-h">
          <div className="wrap">
            <div className="section-head section-head--wide">
              <h2 id="mech-h">Collateral moves on Sepolia. The position dies on Creditcoin.</h2>
            </div>

            <div className="panel-grid">
              <article className="panel">
                <div className="panel__head">
                  <span>Ethereum Sepolia</span>
                  <span className="id">0x8036&#8230;EE412</span>
                </div>
                <div className="panel__body">
                  <h3>CollateralVault</h3>
                  <p className="small"><code>withdraw()</code> never blocks on the debt. The vault cannot know your debt on another chain. What it guarantees instead is that every withdrawal emits <code>CollateralWithdrawn(positionId, amount, remaining)</code>.</p>
                </div>
              </article>

              <article className="panel">
                <div className="panel__head">
                  <span>Creditcoin CC3</span>
                  <span className="id">0x44e2&#8230;bA682</span>
                </div>
                <div className="panel__body">
                  <h3>DeadswitchManagerV3</h3>
                  <p className="small"><code>execute()</code> takes the encoded Sepolia transaction with its inclusion and continuity proofs and hands them to the <code>0x0FD2</code> precompile, which verifies them synchronously, in the same transaction. If the attested <code>remaining</code> is below the position's threshold, the position liquidates in that same transaction.</p>
                  <p className="note"><code>execute(chainKey, blockHeight, encodedTransaction, merkleRoot, siblings, lowerEndpointDigest, continuityRoots)</code>. No <code>action</code> parameter, by design: see Finding A.</p>
                </div>
              </article>
            </div>

            <ol className="steps">
              <li>A withdrawal on Sepolia emits <code>CollateralWithdrawn(positionId, amount, remaining)</code>.</li>
              <li>Creditcoin's attestors attest the Sepolia block. Continuity proofs chain the digests between attestation checkpoints.</li>
              <li>Anyone fetches an inclusion and continuity proof and calls <code>DeadswitchManagerV3.execute()</code>. Submission is permissionless. Trust comes from the attestor quorum, not from the submitter.</li>
              <li><code>0x0FD2</code> verifies the proof in-transaction. No callback, no second block.</li>
              <li>Attested <code>remaining</code> below threshold liquidates the position. A proven top-up restores it. Same primitive, opposite direction.</li>
            </ol>

            <figure className="figure figure--wide">
              <div className="figure__frame">
                <div className="scroll-x" tabIndex="0" role="region" aria-label="Architecture diagram, scrollable">
      <svg viewBox="0 0 900 412" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="ds-arch-t ds-arch-d">
      <title id="ds-arch-t">Deadswitch architecture: collateral on Sepolia, debt on Creditcoin, joined only by an Attestcoin receipt</title>
      <desc id="ds-arch-d">Three panels, left to right. On Ethereum Sepolia, CollateralVault at 0x8036 to EE412 never blocks a withdrawal, so every withdrawal is logged as CollateralWithdrawn carrying the remaining balance. Creditcoin's attestors read that Sepolia block over independent RPCs and reach quorum on it only once it can no longer be reorged, which takes about eight to ten minutes; continuity proofs chain the digests between attestation checkpoints. On Creditcoin CC3, anyone can submit the resulting inclusion and continuity proof to DeadswitchManagerV3 at 0x44e2 to bA682, where the 0x0FD2 precompile verifies it inside that same transaction. If the attested remaining collateral is below the position's minimum, the position is liquidated; a proven top-up restores it. A dashed line separates the Sepolia side from the Creditcoin side: the two contracts never call each other, and there is no bridge, no relayer and no price feed.</desc>
      <rect x="0" y="0" width="900" height="412" fill="var(--ground)"/>

      <text x="8" y="18" fontSize="11" fill="var(--text-3)" letterSpacing="0.07em">COLLATERAL ON ETHEREUM. DEBT ON CREDITCOIN.</text>
      <line x1="8" y1="30" x2="892" y2="30" stroke="var(--line)" strokeWidth="1"/>

      <line x1="274" y1="46" x2="274" y2="252" stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="2 5"/>

      <rect x="8" y="46" width="250" height="200" fill="var(--panel)" stroke="var(--line)" strokeWidth="1"/>
      <text x="20" y="66" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">ETHEREUM SEPOLIA</text>
      <line x1="8" y1="76" x2="258" y2="76" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="20" y="97" fontSize="13" fill="var(--text-1)">CollateralVault</text>
      <text className="m" x="20" y="113" fontSize="11" fill="var(--text-3)">0x8036...EE412</text>
      <rect x="20" y="126" width="226" height="50" fill="var(--ground)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="30" y="146" fontSize="11" fill="var(--text-1)">CollateralWithdrawn(#3)</text>
      <text className="m" x="30" y="164" fontSize="11" fill="var(--text-2)">remaining 40.0, min 50.0</text>
      <text x="20" y="199" fontSize="11" fill="var(--text-2)">it never blocks the withdrawal.</text>
      <text x="20" y="215" fontSize="11" fill="var(--text-2)">it cannot know the debt, so it logs.</text>
      <text x="20" y="235" fontSize="11" fill="var(--text-1)">that log is the whole trigger.</text>

      <line x1="258" y1="150" x2="284" y2="150" stroke="var(--text-3)" strokeWidth="1"/>
      <polygon points="284,146 290,150 284,154" fill="var(--text-3)"/>

      <rect x="290" y="46" width="250" height="200" fill="var(--panel)" stroke="var(--line)" strokeWidth="1"/>
      <text x="302" y="66" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">CREDITCOIN ATTESTORS</text>
      <line x1="290" y1="76" x2="540" y2="76" stroke="var(--line)" strokeWidth="1"/>
      <text x="302" y="106" fontSize="20" fill="var(--text-1)">8 to 10 min</text>
      <text x="302" y="126" fontSize="11" fill="var(--text-2)">quorum on the Sepolia block</text>
      <text x="302" y="152" fontSize="11" fill="var(--text-1)">the finality gate. not lag.</text>
      <text x="302" y="176" fontSize="11" fill="var(--text-2)">a block that can still be</text>
      <text x="302" y="190" fontSize="11" fill="var(--text-2)">reorged is never attested.</text>
      <text x="302" y="215" fontSize="11" fill="var(--text-2)">continuity proofs chain the</text>
      <text x="302" y="229" fontSize="11" fill="var(--text-2)">gaps between checkpoints.</text>

      <line x1="540" y1="150" x2="566" y2="150" stroke="var(--text-3)" strokeWidth="1"/>
      <polygon points="566,146 572,150 566,154" fill="var(--text-3)"/>

      <rect x="572" y="46" width="320" height="200" fill="var(--panel)" stroke="var(--line)" strokeWidth="1"/>
      <text x="584" y="66" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">CREDITCOIN CC3</text>
      <line x1="572" y1="76" x2="892" y2="76" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="584" y="97" fontSize="13" fill="var(--text-1)">DeadswitchManagerV3</text>
      <text className="m" x="584" y="113" fontSize="11" fill="var(--text-3)">0x44e2...bA682</text>
      <rect x="584" y="126" width="296" height="50" fill="var(--ground)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="594" y="146" fontSize="11" fill="var(--text-1)">0x0FD2 precompile</text>
      <text x="594" y="164" fontSize="11" fill="var(--text-2)">verifies inside this same transaction</text>
      <text x="584" y="199" fontSize="11" fill="var(--text-2)">anyone can submit the proof.</text>
      <text x="584" y="215" fontSize="11" fill="var(--text-2)">trust is the attestor quorum,</text>
      <text x="584" y="229" fontSize="11" fill="var(--text-2)">not the submitter.</text>

      <text x="8" y="274" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">WHY THERE IS NO ARROW BETWEEN THE CONTRACTS</text>
      <text x="8" y="298" fontSize="11" fill="var(--text-1)">The two contracts never call each other.</text>
      <text x="8" y="316" fontSize="11" fill="var(--text-2)">Creditcoin's own runtime verifies an attested Sepolia</text>
      <text x="8" y="330" fontSize="11" fill="var(--text-2)">receipt. Nothing is bridged, forwarded or priced.</text>

      <text x="572" y="274" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">OUTCOME, IN THAT SAME TRANSACTION</text>
      <rect x="572" y="284" width="155" height="56" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="584" y="306" fontSize="11" fill="var(--text-2)">remaining &lt; min</text>
      <text x="584" y="328" fontSize="13" fill="var(--accent)">LIQUIDATED</text>
      <rect x="737" y="284" width="155" height="56" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text x="749" y="306" fontSize="11" fill="var(--text-2)">a proven top-up</text>
      <text x="749" y="328" fontSize="13" fill="var(--ok)">RESTORED</text>

      <line x1="8" y1="372" x2="892" y2="372" stroke="var(--line)" strokeWidth="1"/>
      <text x="8" y="392" fontSize="11" fill="var(--text-3)">no bridge. no relayer. no price feed.</text>
      </svg>
                </div>
              </div>
              <figcaption className="figure__cap">Sepolia logs the withdrawal, Creditcoin's attestors reach quorum on the block, and the manager verifies the receipt inside one transaction. <span className="figure__hint">Scroll to pan.</span></figcaption>
            </figure>

            <ul className="claims">
              <li><b>No bridge.</b> The proof is checked against attested source-chain state inside Creditcoin's own runtime.</li>
              <li><b>No relayer.</b> Our keeper is a convenience; any address can submit the same proof.</li>
              <li><b>No price feed.</b> The liquidation condition is collateral quantity, read from Sepolia's own receipts.</li>
            </ul>
          </div>
        </section>

        {/* ============ 2. FINDING A ============ */}
        <section id="finding-a" className="section section--sub" aria-labelledby="fa-h">
          <div className="wrap">
            <div className="section-head">
              <span className="section-head__kicker section-head__kicker--finding">Finding A</span>
              <h2 id="fa-h">USCBase burns the replay key before it looks at the action.</h2>
              <p>The replay key omits the one field the caller controls.</p>
              <p className="note">Threat model: the attacker is the position owner. What they gain is a position that holds no collateral and can never be liquidated. What it costs is one composed transaction and gas.</p>
            </div>

            <div className="transcript">
              <div className="transcript__bar"><span>Replay key</span><span className="chain">USCBase.sol</span></div>
              <div className="scroll-x" tabIndex="0" role="region" aria-label="Replay key source, scrollable"><pre>queryId = keccak256(chainKey, blockHeight, txIndex)   <span className="t-note">// USCBase.sol:30 calls _computeQueryId; the</span>
                                                           <span className="t-note">// keccak is at :80-86 and 'action' is not in it</span>
      processedQueries[queryId] = true;                     <span className="t-note">// USCBase.sol:41, burned regardless of action</span></pre></div>
            </div>

            <div className="figure-split figure-split--gap">
              <div className="stack">
                <p className="small"><code>action</code> is supplied by the caller. So a borrower emits a deposit and a withdrawal in one transaction and submits it as a deposit. The deposit branch records healthy collateral. The key is burned. The withdrawal in that same transaction can never be proven.</p>

                <div className="transcript">
                  <div className="transcript__bar"><span>Against v2, inherits USCBase</span><span className="chain">Creditcoin CC3</span></div>
                  <div className="scroll-x" tabIndex="0" role="region" aria-label="Version 2 transcript, scrollable"><pre>  submitted as action=1 (DEPOSIT), hiding the withdrawal
        <b>accepted.</b> attested collateral = 100.000000000000000001, status = <span className="t-ok">ACTIVE</span>
        same transaction resubmitted as action=0 (WITHDRAWAL)
        <span className="t-dead">REVERTED: "Query already processed"</span></pre></div>
                </div>
                <p className="verify-line">Verify on Creditcoin: <a href="https://creditcoin-testnet.blockscout.com/tx/0xad57de74857ebd0551b7c655707a74a38a7799b8390f3ae0dad4413d0b86162a"><code>0xad57de74&#8230;</code></a>. v2 emitted <code>CollateralAttested(200, &#8230;, 100.000000000000000001)</code> and <code>PositionRestored(200, &#8230;)</code> for a position whose collateral had already left.</p>

                <p className="small">The collateral is gone. The position reports 100 TST and ACTIVE. It can never be liquidated.</p>
                <p className="note">The trailing wei is the deposit leg: 100 TST already in the vault plus the 1 wei the attacker deposits to create the second log. It is how you can tell this transaction was executed on Sepolia rather than composed for a slide.</p>

                <div className="transcript">
                  <div className="transcript__bar"><span>Against v3</span><span className="chain">Creditcoin CC3</span></div>
                  <div className="scroll-x" tabIndex="0" role="region" aria-label="Version 3 transcript, scrollable"><pre>  CollateralAttested(#200): remaining 100.000000000000000001
        CollateralAttested(#200): remaining 0.000000000000000001
        <span className="t-dead">PositionLiquidated(#200): 0.000000000000000001 &lt; 50.0</span></pre></div>
                </div>
                <p className="verify-line">Verify on Creditcoin: <a href="https://creditcoin-testnet.blockscout.com/tx/0xfc12b6871a52628ab4e2751a2997809c583241432849156f10536d16b301477d"><code>0xfc12b687&#8230;</code></a>. Decoded <code>CollateralAttested(200, 100.000000000000000001)</code>, <code>CollateralAttested(200, 1 wei)</code>, <code>PositionLiquidated(200, 1 wei, 50.0)</code>.</p>

                <p className="small">Precondition: the attacker composes both vault calls into one transaction. Here that is <code>Attacker.suppress()</code> at <code>0x100fF3E7&#8230;C933</code>, which calls <code>vault.deposit()</code> and then <code>vault.withdraw()</code>. Any <code>USCBase</code> consumer whose vault permits that composition is affected, including Deadswitch v2, because <code>action</code> is not in the replay key.</p>

                <div className="repro">
                  <div className="repro__row">
                    <span className="label">Sepolia tx</span>
                    <span className="repro__v"><a className="hash-link" href="https://sepolia.etherscan.io/tx/0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3">0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3</a></span>
                  </div>
                  <div className="repro__row">
                    <span className="label">Reproduce</span>
                    <span className="repro__v"><code>yarn attack suppression &lt;tx&gt; &lt;positionId&gt;</code></span>
                  </div>
                </div>
              </div>

              <figure className="figure figure--narrow">
                <div className="figure__frame">
                  <div className="scroll-x" tabIndex="0" role="region" aria-label="Finding A diagram, scrollable">
      <svg viewBox="0 0 400 716" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="ds-fa-t ds-fa-d">
      <title id="ds-fa-t">Finding A: action-selector suppression against a USCBase consumer, and the v3 fix</title>
      <desc id="ds-fa-d">One Sepolia transaction carries two logs from the registered CollateralVault: log zero is CollateralDeposited of one wei, log one is CollateralWithdrawn of the whole balance leaving one wei remaining. Against DeadswitchManager v2, which inherits the tutorial's USCBase, the attacker submits the transaction with action equal to one, the deposit branch. Log zero is consumed, the manager records attested collateral of 100.000000000000000001 and status ACTIVE, and the replay key keccak of chain key, block height and transaction index is burned. Because action is not part of that key, log one can never be read: resubmitting the same transaction as a withdrawal reverts with Query already processed. The collateral is gone while the position reports 100 TST and ACTIVE. Against DeadswitchManagerV3 there is no action parameter; the action is derived from each log's own topics and every vault log is applied in order, producing CollateralAttested at 100.000000000000000001, then CollateralAttested at 0.000000000000000001, then PositionLiquidated for position 200 because 0.000000000000000001 is below the 50.0 threshold.</desc>
      <rect x="0" y="0" width="400" height="716" fill="var(--ground)"/>

      <text x="6" y="16" fontSize="11" fill="var(--text-2)" letterSpacing="0.07em">FINDING A. ACTION-SELECTOR SUPPRESSION</text>
      <text x="6" y="31" fontSize="11" fill="var(--text-3)">a flaw in USCBase itself. it defeats Deadswitch v2.</text>
      <line x1="6" y1="42" x2="394" y2="42" stroke="var(--line)" strokeWidth="1"/>

      <rect x="6" y="54" width="388" height="110" fill="var(--panel)" stroke="var(--line)" strokeWidth="1"/>
      <text x="16" y="70" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">ONE SEPOLIA TRANSACTION</text>
      <text className="m" x="384" y="70" fontSize="11" fill="var(--text-3)" textAnchor="end">0x979a57...fffd3</text>
      <line x1="6" y1="78" x2="394" y2="78" stroke="var(--line)" strokeWidth="1"/>
      <rect x="16" y="86" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="97" fontSize="11" fill="var(--text-2)" textAnchor="middle">[0]</text>
      <text className="m" x="50" y="97" fontSize="11" fill="var(--text-1)">CollateralDeposited(1 wei)</text>
      <text className="m" x="384" y="97" fontSize="11" fill="var(--text-3)" textAnchor="end">CollateralVault</text>
      <rect x="16" y="110" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="121" fontSize="11" fill="var(--text-2)" textAnchor="middle">[1]</text>
      <text className="m" x="50" y="121" fontSize="11" fill="var(--text-1)">CollateralWithdrawn(all of it)</text>
      <text className="m" x="384" y="121" fontSize="11" fill="var(--text-3)" textAnchor="end">CollateralVault</text>
      <text className="m" x="50" y="135" fontSize="11" fill="var(--text-2)">remaining 0.000000000000000001</text>
      <text x="16" y="155" fontSize="11" fill="var(--text-3)">both logs come from the registered vault.</text>

      <rect x="6" y="180" width="388" height="268" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="16" y="197" fontSize="12.5" fill="var(--text-1)">DeadswitchManager v2</text>
      <text x="384" y="197" fontSize="11" fill="var(--text-3)" textAnchor="end">inherits USCBase</text>
      <line x1="6" y1="206" x2="394" y2="206" stroke="var(--line)" strokeWidth="1"/>

      <text x="16" y="224" fontSize="11" fill="var(--text-2)">the attacker submits it as action = 1 (DEPOSIT)</text>
      <rect x="16" y="234" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="245" fontSize="11" fill="var(--text-2)" textAnchor="middle">[0]</text>
      <text x="50" y="245" fontSize="11" fill="var(--text-1)">consumed as a deposit</text>
      <text className="m" x="50" y="259" fontSize="11" fill="var(--text-2)">attested collateral = 100.000000000000000001</text>
      <text className="m" x="50" y="273" fontSize="11" fill="var(--ok)">status = ACTIVE</text>

      <rect x="16" y="284" width="26" height="15" fill="none" stroke="var(--edge)" strokeWidth="1"/>
      <text className="m" x="29" y="295" fontSize="11" fill="var(--text-3)" textAnchor="middle">[1]</text>
      <rect x="50" y="282" width="334" height="36" fill="none" stroke="var(--edge)" strokeWidth="1" strokeDasharray="2 4"/>
      <text className="m" x="58" y="296" fontSize="11" fill="var(--text-3)">CollateralWithdrawn never read</text>
      <line x1="58" y1="292" x2="256" y2="292" stroke="var(--text-3)" strokeWidth="1"/>
      <text x="58" y="311" fontSize="11" fill="var(--text-3)">the caller chose which half of the tx is seen</text>

      <text className="m" x="16" y="337" fontSize="11" fill="var(--text-2)">queryId = keccak(chainKey, blockHeight, txIndex)</text>
      <text x="16" y="351" fontSize="11" fill="var(--accent)">action is not in that key. the query is burned.</text>

      <text x="16" y="375" fontSize="11" fill="var(--text-2)">anyone resubmits it as action = 0 (WITHDRAWAL)</text>
      <text x="16" y="393" fontSize="12" fill="var(--accent)">REVERTED</text>
      <text className="m" x="84" y="393" fontSize="11" fill="var(--text-2)">Query already processed</text>

      <line x1="16" y1="408" x2="384" y2="408" stroke="var(--line)" strokeWidth="1"/>
      <text x="16" y="426" fontSize="11" fill="var(--accent)">the collateral is gone. the position reports</text>
      <text x="16" y="440" fontSize="11" fill="var(--accent)">100 TST and ACTIVE. it can never be liquidated.</text>

      <rect x="6" y="464" width="388" height="192" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="16" y="481" fontSize="12.5" fill="var(--text-1)">DeadswitchManagerV3</text>
      <text className="m" x="384" y="481" fontSize="11" fill="var(--text-3)" textAnchor="end">DeadswitchBase</text>
      <line x1="6" y1="490" x2="394" y2="490" stroke="var(--line)" strokeWidth="1"/>
      <text x="16" y="508" fontSize="11" fill="var(--text-2)">no action parameter. the action comes from each</text>
      <text x="16" y="522" fontSize="11" fill="var(--text-2)">log's own topics[0], and both logs are applied.</text>

      <rect x="16" y="534" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="545" fontSize="11" fill="var(--text-2)" textAnchor="middle">[0]</text>
      <text className="m" x="50" y="545" fontSize="11" fill="var(--text-1)">CollateralAttested(#200)</text>
      <text className="m" x="50" y="559" fontSize="11" fill="var(--text-2)">remaining 100.000000000000000001</text>
      <rect x="16" y="570" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="581" fontSize="11" fill="var(--text-2)" textAnchor="middle">[1]</text>
      <text className="m" x="50" y="581" fontSize="11" fill="var(--text-1)">CollateralAttested(#200)</text>
      <text className="m" x="50" y="595" fontSize="11" fill="var(--text-2)">remaining 0.000000000000000001</text>

      <line x1="16" y1="608" x2="384" y2="608" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="16" y="627" fontSize="12.5" fill="var(--accent)">PositionLiquidated(#200)</text>
      <text className="m" x="16" y="643" fontSize="11" fill="var(--text-2)">0.000000000000000001 &lt; 50.0 threshold</text>

      <line x1="6" y1="672" x2="394" y2="672" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="6" y="688" fontSize="11" fill="var(--text-3)">v2 0x70FD...3BD4</text>
      <text className="m" x="140" y="688" fontSize="11" fill="var(--text-3)">v3 0x44e2...bA682</text>
      <text x="384" y="688" fontSize="11" fill="var(--text-3)" textAnchor="end">CREDITCOIN CC3</text>
      <text className="m" x="6" y="703" fontSize="11" fill="var(--text-3)">yarn attack suppression 0x979a57...fffd3 200</text>
      </svg>
                  </div>
                </div>
                <figcaption className="figure__cap">One transaction, two vault logs. v2 consumes the deposit and burns the key. v3 applies both logs in order and liquidates.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ============ 3. DEMONSTRATION ============ */}
        <section id="demonstration" className="section" aria-labelledby="demo-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="demo-h">One proof. Two managers. One of them dies.</h2>
              <p><code>CollateralWithdrawn(uint256 indexed, uint256, uint256)</code> is a public event signature. Anyone can deploy a contract that emits it with someone else's <code>positionId</code> and <code>remaining = 0</code>. <code>MaliciousVault.forge()</code> does exactly that. The event is genuine. The proof is genuine. The vault is a lie.</p>
              <p className="lead">The same proof, submitted to two contracts:</p>
            </div>

            <div className="callout-pair">
              <article className="callout callout--dead">
                <span className="callout__kicker">Guards removed</span>
                <h3 className="callout__title">NaiveManager</h3>
                <div className="callout__result"><code>PositionLiquidated(#100)</code> and <code>PositionLiquidated(#101)</code></div>
                <p>Two healthy positions the attacker does not own.</p>
              </article>

              <article className="callout callout--held">
                <span className="callout__kicker">Emitter check intact</span>
                <h3 className="callout__title">Deadswitch</h3>
                <div className="callout__result">Reverts: <code>"Event not emitted by registered vault"</code></div>
                <p>The forged proof bounces. The position survives.</p>
              </article>
            </div>

            <p className="verify-line">Verify on Creditcoin: <a href="https://creditcoin-testnet.blockscout.com/tx/0xcf6de9f84b744ca44a195cef4f9b53cbe6d5007cad2a8e55e050d880f4b7c09b"><code>0xcf6de9f8&#8230;</code></a> liquidates position #100 and <a href="https://creditcoin-testnet.blockscout.com/tx/0x93beaff8952dd5cd8e9515996d51a387e50cedbe6f5865a712526535dc47b8b2"><code>0x93beaff8&#8230;</code></a> liquidates #101, both on NaiveManager, both from a forged <code>CollateralWithdrawn</code>. The Sepolia forge below is <code>MaliciousVault.forge(100)</code>; the matching forge for #101 is <a className="hash-link" href="https://sepolia.etherscan.io/tx/0x72e20bf616b56167bd93af57ef37fce2b3955b7e5497defc165301f02bc26ef9"><code>0x72e20bf6&#8230;</code></a>.</p>

            <div className="repro">
              <p className="note">Gluwa's loan tutorial already teaches emitter authentication and receipt-status checking: <code>USCLoanManager.sol:240</code> and <code>:267</code>, landed in <a className="link" href="https://github.com/gluwa/USC-Builder-Examples/pull/92">PR #92</a>, commit <a className="link" href="https://github.com/gluwa/USC-Builder-Examples/commit/4ff9a3b">4ff9a3b</a>, 2026-07-29. Deadswitch implements all ten of the tutorial's guards: those two, which the tutorial names explicitly, and its setup steps, including registering the source contract as its own numbered step (<code>loan-flow/README.md</code> &sect;1.5). We are not claiming the tutorial is missing them. What this section adds is the executable proof that the emitter guard is load-bearing.</p>
              <p className="note">The contract that holds here is DeadswitchManager v2 at <code>0x70FD&#8230;3BD4</code>, which is what <code>yarn exploit</code> submits to; the string comes from <code>DeadswitchManager.sol:128</code>. v3 rejects the same proof by a different route: it skips the foreign log rather than reverting on it, so nothing is left to apply and it reverts <code>"No vault collateral events in transaction"</code> (<code>DeadswitchManagerV3.sol:123</code>). Either way the position survives, and the emitter check is enforced as a skip rather than a revert. Finding B is why.</p>
              <p className="note">NaiveManager is a control we built by removing the checks. It is not a claim about anyone's code.</p>
              <div className="repro__row">
                <span className="label">Forge tx</span>
                <span className="repro__v"><a className="hash-link" href="https://sepolia.etherscan.io/tx/0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f">0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f</a></span>
              </div>
              <div className="repro__row">
                <span className="label">Reproduce</span>
                <span className="repro__v"><code>yarn exploit &lt;tx&gt; &lt;positionId&gt;</code></span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 4. FINDING B ============ */}
        <section id="finding-b" className="section section--sub" aria-labelledby="fb-h">
          <div className="wrap">
            <div className="section-head">
              <span className="section-head__kicker section-head__kicker--finding">Finding B</span>
              <h2 id="fb-h">The same revert string is the hero in one demo and the weapon in the other.</h2>
              <p>Both outcomes turn on one string: <code>"Event not emitted by registered vault"</code>.</p>
            </div>

            <div className="mirror">
              <div>
                <div className="m-state m-state--ok">The guard held</div>
                <p><strong>In the forged-event demonstration, the v2 guard saves a position.</strong> The forged event bounces off <code>require(log.address_ == sourceVault)</code>.</p>
              </div>
              <div>
                <div className="m-state m-state--dead">The position died</div>
                <p><strong>Here the same v2 guard destroys one.</strong> A <code>USCBase</code> consumer reads <code>logs[0]</code> and reverts the whole transaction if the emitter check fails.</p>
              </div>
            </div>

            <div className="fb-body">
              <p>Prefix a decoy <code>CollateralWithdrawn</code> from a throwaway contract in the same transaction as the genuine withdrawal, and the genuine withdrawal is permanently unprovable. Against v2, every submission reverts with that string, forever. The collateral left and the position cannot be told.</p>
              <p>A guard that rejects a whole transaction because of one log it does not own is a denial-of-service primitive. The same <code>logs[0]</code> shortcut is in the tutorial at <code>USCLoanManager.sol:254-257</code>.</p>
            </div>

            <div className="figure-split figure-split--mirror figure-split--gap">

              <div>
                <div className="transcript">
                  <div className="transcript__bar"><span>Against v3</span><span className="chain">Creditcoin CC3</span></div>
                  <div className="scroll-x" tabIndex="0" role="region" aria-label="Finding B version 3 transcript, scrollable"><pre>  CollateralAttested(#201): remaining 0.0
        <span className="t-dead">PositionLiquidated(#201): 0.0 &lt; 50.0</span></pre></div>
                </div>
                <p className="verify-line">Verify on Creditcoin: <a href="https://creditcoin-testnet.blockscout.com/tx/0x4e2fb7d6e3c537c3fc64fd270192fd86bcefc4bf12ef8b4c0a5d8827492009ae"><code>0x4e2fb7d6&#8230;</code></a>. Decoded <code>CollateralAttested(201, 0)</code>, <code>PositionLiquidated(201, 0, 50.0)</code>.</p>

                <div className="repro">
                  <div className="repro__row">
                    <span className="label">Sepolia tx</span>
                    <span className="repro__v"><a className="hash-link" href="https://sepolia.etherscan.io/tx/0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3">0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3</a></span>
                  </div>
                  <div className="repro__row">
                    <span className="label">Reproduce</span>
                    <span className="repro__v"><code>yarn attack decoy &lt;tx&gt; &lt;positionId&gt;</code></span>
                  </div>
                </div>
              </div>
              <figure className="figure figure--narrow">
                <div className="figure__frame">
                  <div className="scroll-x" tabIndex="0" role="region" aria-label="Finding B diagram, scrollable">
      <svg viewBox="0 0 400 706" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="ds-fb-t ds-fb-d">
      <title id="ds-fb-t">Finding B: decoy-log censorship turns the emitter guard into a denial of service, and the v3 fix</title>
      <desc id="ds-fb-d">One Sepolia transaction carries two logs. Log zero is a decoy CollateralWithdrawn emitted by DecoyVault, a throwaway contract that is not a registered vault. Log one is the genuine CollateralWithdrawn from CollateralVault leaving remaining at zero. DeadswitchManager v2 reads logs index zero only, applies the emitter check requiring the log address to equal the registered source vault, and reverts the entire transaction with Event not emitted by registered vault. Log one never reaches the manager, so the genuine withdrawal is permanently unprovable. This is the same guard that correctly rejects a forged vault in the exploit demonstration; a guard that rejects a whole transaction because of one log it does not own is a denial-of-service primitive. DeadswitchManagerV3 skips foreign logs instead of reverting on them, applies the genuine log, emits CollateralAttested for position 201 with remaining zero, and liquidates because zero is below the 50.0 threshold.</desc>
      <rect x="0" y="0" width="400" height="706" fill="var(--ground)"/>

      <text x="6" y="16" fontSize="11" fill="var(--text-2)" letterSpacing="0.07em">FINDING B. DECOY-LOG CENSORSHIP</text>
      <text x="6" y="31" fontSize="11" fill="var(--text-3)">the emitter guard becomes the censorship vector.</text>
      <line x1="6" y1="42" x2="394" y2="42" stroke="var(--line)" strokeWidth="1"/>

      <rect x="6" y="54" width="388" height="122" fill="var(--panel)" stroke="var(--line)" strokeWidth="1"/>
      <text x="16" y="70" fontSize="11" fill="var(--text-3)" letterSpacing="0.1em">ONE SEPOLIA TRANSACTION</text>
      <text className="m" x="384" y="70" fontSize="11" fill="var(--text-3)" textAnchor="end">0x6f88a9...1bfa3</text>
      <line x1="6" y1="78" x2="394" y2="78" stroke="var(--line)" strokeWidth="1"/>
      <rect x="16" y="86" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="97" fontSize="11" fill="var(--text-2)" textAnchor="middle">[0]</text>
      <text className="m" x="50" y="97" fontSize="11" fill="var(--text-2)">CollateralWithdrawn(#201)</text>
      <text className="m" x="384" y="97" fontSize="11" fill="var(--accent)" textAnchor="end">DecoyVault</text>
      <text className="m" x="50" y="111" fontSize="11" fill="var(--text-3)">0x00c7...Fa3E</text>
      <text x="384" y="111" fontSize="11" fill="var(--text-3)" textAnchor="end">not registered</text>
      <rect x="16" y="124" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="135" fontSize="11" fill="var(--text-2)" textAnchor="middle">[1]</text>
      <text className="m" x="50" y="135" fontSize="11" fill="var(--text-1)">CollateralWithdrawn(#201)</text>
      <text className="m" x="384" y="135" fontSize="11" fill="var(--text-1)" textAnchor="end">CollateralVault</text>
      <text className="m" x="50" y="149" fontSize="11" fill="var(--text-3)">0x8036...EE412</text>
      <text className="m" x="384" y="149" fontSize="11" fill="var(--text-2)" textAnchor="end">remaining 0.0</text>
      <text x="16" y="168" fontSize="11" fill="var(--text-3)">the decoy costs one throwaway contract.</text>

      <rect x="6" y="192" width="388" height="260" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="16" y="209" fontSize="12.5" fill="var(--text-1)">DeadswitchManager v2</text>
      <text x="384" y="209" fontSize="11" fill="var(--text-3)" textAnchor="end">reads logs[0]</text>
      <line x1="6" y1="218" x2="394" y2="218" stroke="var(--line)" strokeWidth="1"/>

      <text x="16" y="236" fontSize="11" fill="var(--text-2)">the consumer reads logs[0] and checks the emitter.</text>
      <rect x="16" y="246" width="368" height="26" fill="var(--ground)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="26" y="263" fontSize="11" fill="var(--text-2)">require(log.address_ == sourceVault)</text>
      <text x="16" y="292" fontSize="12" fill="var(--accent)">REVERTED</text>
      <text className="m" x="16" y="308" fontSize="11" fill="var(--text-2)">"Event not emitted by registered vault"</text>

      <rect x="16" y="322" width="368" height="38" fill="none" stroke="var(--edge)" strokeWidth="1" strokeDasharray="2 4"/>
      <text className="m" x="26" y="338" fontSize="11" fill="var(--text-3)">[1] CollateralWithdrawn(#201)</text>
      <line x1="26" y1="334" x2="217" y2="334" stroke="var(--text-3)" strokeWidth="1"/>
      <text x="26" y="352" fontSize="11" fill="var(--text-3)">never reached it. the whole tx reverted.</text>

      <rect x="16" y="372" width="368" height="66" fill="var(--ground)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text x="26" y="389" fontSize="11" fill="var(--text-1)">the same guard that stops a forged vault in the</text>
      <text x="26" y="403" fontSize="11" fill="var(--text-2)">exploit demo destroys the position here. a guard</text>
      <text x="26" y="417" fontSize="11" fill="var(--text-2)">that rejects a whole transaction over one log it</text>
      <text x="26" y="431" fontSize="11" fill="var(--text-2)">does not own is a denial-of-service primitive.</text>

      <rect x="6" y="468" width="388" height="170" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="16" y="485" fontSize="12.5" fill="var(--text-1)">DeadswitchManagerV3</text>
      <text className="m" x="384" y="485" fontSize="11" fill="var(--text-3)" textAnchor="end">DeadswitchBase</text>
      <line x1="6" y1="494" x2="394" y2="494" stroke="var(--line)" strokeWidth="1"/>
      <text x="16" y="512" fontSize="11" fill="var(--text-2)">foreign logs are skipped, never reverted on.</text>
      <rect x="16" y="524" width="26" height="15" fill="none" stroke="var(--edge)" strokeWidth="1"/>
      <text className="m" x="29" y="535" fontSize="11" fill="var(--text-3)" textAnchor="middle">[0]</text>
      <text x="50" y="535" fontSize="11" fill="var(--text-3)">emitter != registered vault. skipped.</text>
      <rect x="16" y="548" width="26" height="15" fill="none" stroke="var(--line-strong)" strokeWidth="1"/>
      <text className="m" x="29" y="559" fontSize="11" fill="var(--text-2)" textAnchor="middle">[1]</text>
      <text className="m" x="50" y="559" fontSize="11" fill="var(--text-1)">CollateralAttested(#201)</text>
      <text className="m" x="50" y="573" fontSize="11" fill="var(--text-2)">remaining 0.0</text>
      <line x1="16" y1="588" x2="384" y2="588" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="16" y="607" fontSize="12.5" fill="var(--accent)">PositionLiquidated(#201)</text>
      <text className="m" x="16" y="623" fontSize="11" fill="var(--text-2)">0.0 &lt; 50.0 threshold</text>

      <line x1="6" y1="662" x2="394" y2="662" stroke="var(--line)" strokeWidth="1"/>
      <text className="m" x="6" y="678" fontSize="11" fill="var(--text-3)">v2 0x70FD...3BD4</text>
      <text className="m" x="140" y="678" fontSize="11" fill="var(--text-3)">v3 0x44e2...bA682</text>
      <text x="384" y="678" fontSize="11" fill="var(--text-3)" textAnchor="end">CREDITCOIN CC3</text>
      <text className="m" x="6" y="693" fontSize="11" fill="var(--text-3)">yarn attack decoy 0x6f88a9...1bfa3 201</text>
      </svg>
                  </div>
                </div>
                <figcaption className="figure__cap">The decoy costs one throwaway contract. v2 reverts on the foreign log and never reaches the genuine one. v3 skips it and liquidates.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ============ 5. THE FIX ============ */}
        <section id="the-fix" className="section" aria-labelledby="fix-h">
          <div className="wrap">
            <div className="section-head section-head--wide">
              <h2 id="fix-h">DeadswitchBase.sol replaces USCBase in four places.</h2>
            </div>

            <ol className="spec">
              <li>
                <div className="spec__n">01</div>
                <div>
                  <div className="spec__t"><code>action</code> is deleted from the external ABI.</div>
                  <p className="spec__c">The action is derived from each log's own <code>topics[0]</code>. A caller cannot choose which half of a transaction gets seen.</p>
                </div>
                <div className="spec__kill">Kills Finding A</div>
              </li>
              <li>
                <div className="spec__n">02</div>
                <div>
                  <div className="spec__t">Every log from the registered vault is applied, in log order.</div>
                  <p className="spec__c">One transaction carrying a deposit and a withdrawal produces both state transitions, in the right sequence.</p>
                </div>
                <div className="spec__kill">Kills Finding A</div>
              </li>
              <li>
                <div className="spec__n">03</div>
                <div>
                  <div className="spec__t">Foreign logs are skipped, never reverted on.</div>
                  <p className="spec__c">A decoy cannot censor a genuine event, without weakening the emitter check on the logs that matter.</p>
                </div>
                <div className="spec__kill">Kills Finding B</div>
              </li>
              <li>
                <div className="spec__n">04</div>
                <div>
                  <div className="spec__t"><code>blockHeight</code> is threaded into the handler and stored per position.</div>
                  <p className="spec__c">A stale proof cannot overwrite newer attested state. <code>USCBase</code> passes only the <code>queryId</code>, which makes this guard impossible to write.</p>
                </div>
                <div className="spec__kill">Stale-proof guard</div>
              </li>
            </ol>

            <p className="ledger-note">Both findings are written up in full in <a className="link" href="https://github.com/Nuel-osas/deadswitch/blob/main/SECURITY.md"><code>SECURITY.md</code></a>, with the file and line references on both sides. They are prepared for upstream disclosure to <code>gluwa/USC-Builder-Examples</code> and filed upstream rather than filed as a public issue while judging is open.</p>
          </div>
        </section>

        {/* ============ 6. EVIDENCE ============ */}
        <section id="evidence" className="section section--sub" aria-labelledby="ev-h">
          <div className="wrap">
            <div className="section-head section-head--wide">
              <h2 id="ev-h">Every contract and every claim below is on a public testnet right now.</h2>
            </div>

            <div className="stat-row">
              <div className="stat">
                <span className="stat__label">Contracts deployed</span>
                <span className="stat__value">10</span>
              </div>
              <div className="stat">
                <span className="stat__label">Verified on Blockscout</span>
                <span className="stat__value">5</span>
              </div>
              <div className="stat">
                <span className="stat__label">Findings reproduced</span>
                <span className="stat__value">2</span>
              </div>
              <div className="stat">
                <span className="stat__label">Claims retracted</span>
                <span className="stat__value">1</span>
              </div>
            </div>

            <h3 id="deployments" className="sub-head sub-head--gap">Deployments</h3>
            <div className="ledger-wrap">
              <div className="scroll-x" tabIndex="0" role="region" aria-label="Deployment ledger, scrollable">
                <table className="ledger">
                  <caption className="sr-only">Deadswitch contract deployments on Ethereum Sepolia and Creditcoin CC3</caption>
                  <thead>
                    <tr>
                      <th scope="col">Contract</th>
                      <th scope="col">Chain</th>
                      <th scope="col">Address</th>
                      <th scope="col">Why it exists</th>
                      <th scope="col"><span className="sr-only">Copy address</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th scope="rowgroup" colSpan="5">Live and current</th></tr>
                    <tr>
                      <td className="c-name">DeadswitchManagerV3</td>
                      <td className="c-chain">Creditcoin CC3</td>
                      <td className="c-addr">
                        <a className="addr" href="https://creditcoin-testnet.blockscout.com/address/0x44e2d55Af74f400b97fBC010Acd504A1458bA682" id="a1">0x44e2d55Af74f400b97fBC010Acd504A1458bA682</a>
                        <span className="verified"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M8 1.6 13.4 4v4c0 2.9-2.1 5.4-5.4 6.4C4.7 13.4 2.6 10.9 2.6 8V4L8 1.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.8 8 1.6 1.7 3-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Verified on Blockscout</span>
                      </td>
                      <td className="c-why">The current manager. Consumes the <code>0x0FD2</code> precompile.</td>
                      <td className="c-act"><button className="copy" data-copy="a1" aria-label="Copy DeadswitchManagerV3 address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">CollateralVault</td>
                      <td className="c-chain">Sepolia</td>
                      <td className="c-addr">
                        <a className="addr" href="https://sepolia.etherscan.io/address/0x80366d27b907828A36243140ce6ACED6350EE412" id="a2">0x80366d27b907828A36243140ce6ACED6350EE412</a>
                      </td>
                      <td className="c-why">Holds the collateral. Emits every withdrawal.</td>
                      <td className="c-act"><button className="copy" data-copy="a2" aria-label="Copy CollateralVault address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">TestERC20 (TST)</td>
                      <td className="c-chain">Sepolia</td>
                      <td className="c-addr">
                        <a className="addr" href="https://sepolia.etherscan.io/address/0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c" id="a3">0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c</a>
                      </td>
                      <td className="c-why">The collateral asset. Shares an address with DeadswitchManager v1 on CC3: same deployer, same nonce, two chains. This row is the Sepolia one.</td>
                      <td className="c-act"><button className="copy" data-copy="a3" aria-label="Copy TestERC20 address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">EvmV1Decoder</td>
                      <td className="c-chain">Creditcoin CC3</td>
                      <td className="c-addr">
                        <a className="addr" href="https://creditcoin-testnet.blockscout.com/address/0x60b70BC2E774d7A781138009A28B2917893dc98A" id="a10">0x60b70BC2E774d7A781138009A28B2917893dc98A</a>
                        <span className="verified"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M8 1.6 13.4 4v4c0 2.9-2.1 5.4-5.4 6.4C4.7 13.4 2.6 10.9 2.6 8V4L8 1.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.8 8 1.6 1.7 3-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Verified on Blockscout</span>
                      </td>
                      <td className="c-why">Decodes the attested EVM receipt into typed logs. The library the manager reads the source chain through.</td>
                      <td className="c-act"><button className="copy" data-copy="a10" aria-label="Copy EvmV1Decoder address">Copy</button></td>
                    </tr>
                  </tbody>
                  <tbody>
                    <tr><th scope="rowgroup" colSpan="5">Kept so the security demos stay reproducible</th></tr>
                    <tr>
                      <td className="c-name">DeadswitchManager v2</td>
                      <td className="c-chain">Creditcoin CC3</td>
                      <td className="c-addr">
                        <a className="addr" href="https://creditcoin-testnet.blockscout.com/address/0x70FD9432620accb22E015E3929FF948B41aa3BD4" id="a4">0x70FD9432620accb22E015E3929FF948B41aa3BD4</a>
                        <span className="verified"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M8 1.6 13.4 4v4c0 2.9-2.1 5.4-5.4 6.4C4.7 13.4 2.6 10.9 2.6 8V4L8 1.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.8 8 1.6 1.7 3-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Verified on Blockscout</span>
                      </td>
                      <td className="c-why">Inherits the tutorial's <code>USCBase</code>. The contract the attacks defeat.</td>
                      <td className="c-act"><button className="copy" data-copy="a4" aria-label="Copy DeadswitchManager v2 address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">DeadswitchManager v1</td>
                      <td className="c-chain">Creditcoin CC3</td>
                      <td className="c-addr">
                        <a className="addr" href="https://creditcoin-testnet.blockscout.com/address/0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c" id="a5">0xe12EEc4cD89F695A709e27E8ceb01b213fcd9a0c</a>
                  
                      </td>
                      <td className="c-why">Carries the first live liquidations. Same address as TestERC20 above, on a different chain: same deployer, same nonce.</td>
                      <td className="c-act"><button className="copy" data-copy="a5" aria-label="Copy DeadswitchManager v1 address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">NaiveManager</td>
                      <td className="c-chain">Creditcoin CC3</td>
                      <td className="c-addr">
                        <a className="addr" href="https://creditcoin-testnet.blockscout.com/address/0x9EdeA943Bc77caF9cB892077575E2d7E7f2B5142" id="a6">0x9EdeA943Bc77caF9cB892077575E2d7E7f2B5142</a>
                        <span className="verified"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M8 1.6 13.4 4v4c0 2.9-2.1 5.4-5.4 6.4C4.7 13.4 2.6 10.9 2.6 8V4L8 1.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.8 8 1.6 1.7 3-3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>Verified on Blockscout</span>
                      </td>
                      <td className="c-why">Control. Guards removed.</td>
                      <td className="c-act"><button className="copy" data-copy="a6" aria-label="Copy NaiveManager address">Copy</button></td>
                    </tr>
                  </tbody>
                  <tbody className="is-adversarial">
                    <tr><th scope="rowgroup" colSpan="5">Adversarial contracts</th></tr>
                    <tr>
                      <td className="c-name">MaliciousVault</td>
                      <td className="c-chain">Sepolia</td>
                      <td className="c-addr">
                        <a className="addr" href="https://sepolia.etherscan.io/address/0x8e1a6afA1EAC9e3Ac266c4e76D9b79835606C604" id="a7">0x8e1a6afA1EAC9e3Ac266c4e76D9b79835606C604</a>
                      </td>
                      <td className="c-why">Forges the event in the forged-event demonstration. Source: <a className="link" href="https://github.com/Nuel-osas/deadswitch/blob/main/contracts/MaliciousVault.sol"><code>contracts/MaliciousVault.sol</code></a></td>
                      <td className="c-act"><button className="copy" data-copy="a7" aria-label="Copy MaliciousVault address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">DecoyVault</td>
                      <td className="c-chain">Sepolia</td>
                      <td className="c-addr">
                        <a className="addr" href="https://sepolia.etherscan.io/address/0x00c7c4807981045550f582726f8133459e36Fa3E" id="a8">0x00c7c4807981045550f582726f8133459e36Fa3E</a>
                      </td>
                      <td className="c-why">Emits the decoy log in Finding B. Source: <a className="link" href="https://github.com/Nuel-osas/deadswitch/blob/main/contracts/DecoyVault.sol"><code>contracts/DecoyVault.sol</code></a></td>
                      <td className="c-act"><button className="copy" data-copy="a8" aria-label="Copy DecoyVault address">Copy</button></td>
                    </tr>
                    <tr>
                      <td className="c-name">Attacker</td>
                      <td className="c-chain">Sepolia</td>
                      <td className="c-addr">
                        <a className="addr" href="https://sepolia.etherscan.io/address/0x100fF3E7E7A115E181a0aC06d8a004dcbCccC933" id="a9">0x100fF3E7E7A115E181a0aC06d8a004dcbCccC933</a>
                      </td>
                      <td className="c-why">Builds the two-log transactions. Source: <a className="link" href="https://github.com/Nuel-osas/deadswitch/blob/main/contracts/Attacker.sol"><code>contracts/Attacker.sol</code></a></td>
                      <td className="c-act"><button className="copy" data-copy="a9" aria-label="Copy Attacker address">Copy</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="ledger-note">All addresses and transactions are testnet: Sepolia and Creditcoin CC3. Four of the five CC3 contracts are source-verified on Blockscout, so every event on this page decodes publicly. v1 is not: its bytecode predates the deposit path later added to <code>DeadswitchManager.sol</code>, so the current source no longer matches it, and we would rather leave it unverified than ship a mismatched source. The three adversarial contracts are not source-verified on Etherscan; their Solidity is linked in the rows above, and everything they emit is a public event signature you can reproduce from a clone.</p>

            <h3 id="transactions" className="sub-head sub-head--gap">Transactions</h3>
            <p className="ledger-note flush">Each hash below is the Sepolia cause. The Creditcoin effect it produces is named beside it, and every one of them is reproducible from a clone with the commands in <a className="link" href="#run-it">Run it</a>.</p>

            <ol className="tx-list">
              <li>
                <div className="tx-list__label">Proven kill</div>
                <div>
                  <a className="hash-link" href="https://sepolia.etherscan.io/tx/0x87585c3b4d832d8519220cfe8da89a924500da931537bbff04e01c7b20784b10">0x87585c3b4d832d8519220cfe8da89a924500da931537bbff04e01c7b20784b10</a>
                  <p className="tx-list__desc">Sepolia cause: withdrawal 100 to 40 TST on position #1, threshold 50. Creditcoin effect: proof submitted to DeadswitchManager v1, <code>PositionLiquidated(1, 40e18, 50e18)</code>.</p>
                </div>
              </li>
              <li>
                <div className="tx-list__label">Forged event</div>
                <div>
                  <a className="hash-link" href="https://sepolia.etherscan.io/tx/0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f">0x4a039a4d60ecb3322ba00d416cf39e3ee5291e8669d5f67e172b0acd5c46721f</a>
                  <p className="tx-list__desc">Sepolia cause: MaliciousVault emits <code>CollateralWithdrawn</code> for position #101, which it does not own. Creditcoin effect: NaiveManager liquidates the forged targets #100 (<a className="link" href="https://creditcoin-testnet.blockscout.com/tx/0xcf6de9f84b744ca44a195cef4f9b53cbe6d5007cad2a8e55e050d880f4b7c09b"><code>0xcf6de9f8&#8230;</code></a>) and #101 (<a className="link" href="https://creditcoin-testnet.blockscout.com/tx/0x93beaff8952dd5cd8e9515996d51a387e50cedbe6f5865a712526535dc47b8b2"><code>0x93beaff8&#8230;</code></a>); the emitter check rejects the same proof.</p>
                </div>
              </li>
              <li>
                <div className="tx-list__label">Action-selector suppression</div>
                <div>
                  <a className="hash-link" href="https://sepolia.etherscan.io/tx/0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3">0x979a5719fce321311fc67388f09110831ebda6fb53d9ab244e45de54cedfffd3</a>
                  <p className="tx-list__desc">Sepolia cause: one transaction carrying a deposit and a withdrawal on position #200. Creditcoin effect: v2 accepts it as a deposit and burns the key (<a className="link" href="https://creditcoin-testnet.blockscout.com/tx/0xad57de74857ebd0551b7c655707a74a38a7799b8390f3ae0dad4413d0b86162a"><code>0xad57de74&#8230;</code></a>); v3 applies both logs and liquidates #200 (<a className="link" href="https://creditcoin-testnet.blockscout.com/tx/0xfc12b6871a52628ab4e2751a2997809c583241432849156f10536d16b301477d"><code>0xfc12b687&#8230;</code></a>). Finding A.</p>
                </div>
              </li>
              <li>
                <div className="tx-list__label">Decoy-log censorship</div>
                <div>
                  <a className="hash-link" href="https://sepolia.etherscan.io/tx/0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3">0x6f88a998739bb6a9f11d252d4a35ce4f327cfc8567af3731c4eabf354b31bfa3</a>
                  <p className="tx-list__desc">Sepolia cause: a decoy <code>CollateralWithdrawn</code> prefixed before the genuine withdrawal on position #201. Creditcoin effect: v2 reverts forever; v3 skips the decoy and liquidates #201 (<a className="link" href="https://creditcoin-testnet.blockscout.com/tx/0x4e2fb7d6e3c537c3fc64fd270192fd86bcefc4bf12ef8b4c0a5d8827492009ae"><code>0x4e2fb7d6&#8230;</code></a>). Finding B.</p>
                </div>
              </li>
            </ol>

            <p className="ledger-note">Position IDs on this page: <strong>#1</strong> the first proven kill, <strong>#3</strong> the live position the console watches, staged in <code>.env.example</code>, <strong>#100</strong> and <strong>#101</strong> the forged-event targets, <strong>#200</strong> Finding A, <strong>#201</strong> Finding B.</p>
          </div>
        </section>

        {/* ============ 7. FINALITY ============ */}
        <section id="finality" className="section" aria-labelledby="fin-h">
          <div className="wrap">
            <div className="section-head section-head--wide">
              <h2 id="fin-h">The eight to ten minutes are not lag. They are the finality guarantee, and we built them in.</h2>
            </div>

            <p className="measure">A Sepolia event becomes provable roughly 8 to 10 minutes after inclusion, because attestors wait out the source chain's reversion risk before they attest. That wait is the protection: fire a liquidation on a block that can still be reorged and the liquidation can be un-happened, leaving a dead position on Creditcoin whose triggering withdrawal no longer exists. Deadswitch never acts on a block that can still disappear.</p>
            <p className="note">Quorum resists forgery structurally: honest attestors follow the canonical chain through independent RPCs and compute identical digests, and a fabricated block changes every digest after it, so it never reaches quorum.</p>

            <ol className="timeline">
              <li className="tl-step">
                <div className="tl-when">T+0</div>
                <p>Withdrawal included in a Sepolia block. <code>CollateralWithdrawn</code> is in the receipt.</p>
              </li>
              <li className="tl-step">
                <div className="tl-when">T+8 to 10 min</div>
                <p>Attestors reach quorum on the block. Continuity proofs chain the digests between checkpoints.</p>
              </li>
              <li className="tl-step">
                <div className="tl-when">Same transaction</div>
                <p>Anyone submits. <code>0x0FD2</code> verifies, the manager decodes and authenticates the log, the position liquidates.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* ============ 8. RETRACTION ============ */}
        <section id="retraction" className="section section--sub" aria-labelledby="ret-h">
          <div className="wrap">
            <div className="section-head">
              <span className="section-head__kicker">Retraction</span>
              <h2 id="ret-h">One claim did not survive checking, so we deleted it.</h2>
            </div>

            <div className="callout callout--retraction">
              <span className="callout__kicker">EIP-658</span>
              <p>An earlier draft of our security document claimed a reverted source transaction could carry a <code>CollateralWithdrawn</code> log. That is wrong. Under EIP-658 a reverted transaction's receipt carries no logs at all, so the log-presence check subsumes the status check on EVM sources.</p>
              <span className="callout__kicker">Kept as an invariant, not claimed as an exploit</span>
              <p><code>require(receiptStatus == 1)</code> stays in the contract as an explicit invariant. It covers non-EVM source chains and decoder changes, where that guarantee does not hold. It is not a demonstrable exploit and we no longer claim it is.</p>
            </div>

            <h3 id="scope" className="sub-head sub-head--gap">Scope</h3>
            <div className="annot">
              <span className="label">MVP boundary</span>
              <div>
                <p><strong>Scope.</strong> This is an MVP and the boundary is drawn on purpose. One collateral asset. One source chain. Liquidation and restore. Positions are owner-registered: there is no lender-matching market, no interest accrual, no auctions.</p>
              </div>
            </div>
            <div className="annot">
              <span className="label">On-chain effect</span>
              <div>
                <p><strong>What liquidation does on-chain.</strong> It sets the position's status to <code>Liquidated</code> and emits <code>PositionLiquidated(positionId, remainingCollateral, minCollateral)</code>. Nothing settles: no seizure, no transfer, no auction. A proven top-up back above the threshold flips the status to <code>Active</code> and emits <code>PositionRestored</code>. The state transition is the product here; the settlement layer is not.</p>
              </div>
            </div>
            <div className="annot">
              <span className="label">The submission</span>
              <div>
                <p>The submission is the trust-minimized liquidation primitive and the security work around it. A lending product sits on top of this; it is not what we are showing you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 9. RUN IT ============ */}
        <section id="run-it" className="section" aria-labelledby="run-h">
          <div className="wrap">
            <div className="section-head">
              <h2 id="run-h">It runs from a clone and a testnet key.</h2>
            </div>

            <div className="tiles">
              <article className="panel">
                <h3 className="panel__head">Start it</h3>
                <div className="panel__body">
                  <div className="cmd">
                    <div className="cmd__bar"><button className="copy" data-copy="cmd-start" aria-label="Copy the install and start commands">Copy</button></div>
                    <div className="scroll-x" tabIndex="0" role="region" aria-label="Install and start commands, scrollable"><pre id="cmd-start">yarn install &amp;&amp; cp .env.example .env
      yarn server</pre></div>
                  </div>
                  <p className="note">Add a testnet key to <code>.env</code>. Console UI and the permissionless keeper come up on <code>http://127.0.0.1:4020</code>. Withdraw on the Sepolia pane, watch the position die on the Creditcoin pane, with the attestation progress between them.</p>
              <p className="note">Prefer not to clone? The <a className="link" href="app/">hosted console</a> reads the same live state straight from the public RPCs, and lets you submit an Attestcoin proof yourself with a wallet — proof submission is permissionless.</p>
                  <div><a className="btn btn--secondary btn--sm" href="app/">Launch app</a></div>
                </div>
              </article>

              <article className="panel">
                <h3 className="panel__head">Reproduce Finding A or Finding B</h3>
                <div className="panel__body">
                  <div className="cmd">
                    <div className="cmd__bar"><button className="copy" data-copy="cmd-attack" aria-label="Copy the attack command">Copy</button></div>
                    <div className="scroll-x" tabIndex="0" role="region" aria-label="Attack command, scrollable"><pre id="cmd-attack">yarn attack &lt;suppression|decoy&gt; &lt;tx&gt; &lt;positionId&gt;</pre></div>
                  </div>
                  <p className="note">Runs the chosen finding against v2 and v3. v2 fails, v3 liquidates correctly.</p>
                </div>
              </article>

              <article className="panel">
                <h3 className="panel__head">Reproduce the forged-event demonstration</h3>
                <div className="panel__body">
                  <div className="cmd">
                    <div className="cmd__bar"><button className="copy" data-copy="cmd-exploit" aria-label="Copy the exploit command">Copy</button></div>
                    <div className="scroll-x" tabIndex="0" role="region" aria-label="Exploit command, scrollable"><pre id="cmd-exploit">yarn exploit &lt;tx&gt; &lt;positionId&gt;</pre></div>
                  </div>
                  <p className="note">Submits one proof to NaiveManager and to Deadswitch.</p>
                </div>
              </article>
            </div>

            <p className="run-tail">Contracts, keeper and attack scripts: <a className="link" href="https://github.com/Nuel-osas/deadswitch">Open the repo</a> at <code>github.com/Nuel-osas/deadswitch</code>. The full findings write-up, with file and line references on both sides: <a className="link" href="https://github.com/Nuel-osas/deadswitch/blob/main/SECURITY.md"><code>SECURITY.md</code></a>.</p>
          </div>
        </section>

      </main>

      <footer className="site-footer">
        <div className="site-footer__in">
          <div className="site-footer__brand">
            <a className="brand" href="#top">
              <svg className="brand__mark" viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true" focusable="false"><title>Deadswitch</title><rect x="1.85" y="4.6" width="7.3" height="14.8" rx="1.6" stroke="currentColor" strokeWidth="1.7"/><rect x="14.85" y="4.6" width="7.3" height="14.8" rx="1.6" stroke="currentColor" strokeWidth="1.7"/><path d="M9.15 12h1.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="butt"/><path d="M13.1 12h1.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="butt"/></svg>
              <span className="brand__type">Dead<b>switch</b></span>
            </a>
            <p className="site-footer__blurb">Collateral on Ethereum Sepolia, debt on Creditcoin CC3, joined only by an Attestcoin receipt.</p>
            <span className="chip"><span className="chip__dot"></span>Testnet only</span>
          </div>

          <nav className="footcol" aria-labelledby="foot-index">
            <h2 className="footcol__title" id="foot-index">Index</h2>
            <ul>
              <li><a href="#mechanism">Mechanism</a></li>
              <li><a href="#finding-a">Finding A</a></li>
              <li><a href="#demonstration">Forged event</a></li>
              <li><a href="#finding-b">Finding B</a></li>
              <li><a href="#the-fix">The fix</a></li>
              <li><a href="#deployments">Deployments</a></li>
              <li><a href="#transactions">Transactions</a></li>
              <li><a href="#finality">Finality</a></li>
              <li><a href="#retraction">Retraction</a></li>
              <li><a href="#scope">Scope</a></li>
              <li><a href="#run-it">Run it</a></li>
              <li><a href="app/">Console</a></li>
              <li><a href="https://github.com/Nuel-osas/deadswitch">Repo</a></li>
              <li><a href="https://github.com/Nuel-osas/deadswitch/blob/main/SECURITY.md">SECURITY.md</a></li>
              <li><a href="https://creditcoin-testnet.blockscout.com/">Creditcoin Blockscout</a></li>
              <li><a href="https://sepolia.etherscan.io/">Sepolia Etherscan</a></li>
              <li><span>MIT license</span></li>
            </ul>
          </nav>
        </div>

        <div className="site-footer__base">
          <span>BUIDL CTC 2026 Fall.</span>
          <span>All contracts, addresses and transactions are on testnet: Ethereum Sepolia and Creditcoin CC3.</span>
        </div>
      </footer>

      <span id="copy-status" role="status" aria-live="polite" className="sr-only"></span>
      <LandingEnhancements />
    </>
  );
}
