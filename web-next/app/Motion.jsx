'use client';

import { useEffect } from 'react';

/**
 * Motion layer. Everything here is progressive enhancement: the page is complete
 * and readable with JavaScript off, and every effect is disabled outright under
 * prefers-reduced-motion.
 *
 *  1. Scroll reveals — sections rise as they enter the viewport, once.
 *  2. Counters — hero figures count to their value, so the numbers read as
 *     measured rather than asserted.
 *  3. The hero sequence — the panel performs the liquidation instead of
 *     reporting it: the figures settle, the wire fires, the status flips.
 *  4. Proof path — the architecture diagram draws its own proof line.
 */
export default function Motion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      document.documentElement.classList.add('motion-off');
      return;
    }
    document.documentElement.classList.add('motion-on');

    // ---- 1. scroll reveals -------------------------------------------------
    const targets = document.querySelectorAll(
      'section, .panel, .finding-card, .ledger, .diagram-frame'
    );
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(i % 4, 3) * 60}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
    );
    targets.forEach((el) => io.observe(el));

    // ---- 2. counters -------------------------------------------------------
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    function countTo(el, to, ms = 900) {
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / ms);
        el.textContent = String(Math.round(to * easeOut(t)));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // ---- 3. the hero performs the liquidation ------------------------------
    const panel = document.querySelector('.hero__panel');
    if (panel) {
      const numeric = [];
      panel.querySelectorAll('.stat__value').forEach((v) => {
        const raw = v.childNodes[0];
        if (raw && raw.nodeType === 3 && /^\d+$/.test(raw.textContent.trim())) {
          numeric.push({ node: raw, value: parseInt(raw.textContent.trim(), 10) });
        }
      });
      const state = panel.querySelector('.stat__value--state');
      const finalState = state ? state.textContent : null;

      const run = () => {
        // hold the outcome back so the sequence has somewhere to go
        if (state) {
          state.textContent = 'Active';
          state.classList.remove('stat__value--dead');
          state.classList.add('stat__value--alive');
        }
        numeric.forEach((n, i) => {
          const el = document.createElement('span');
          el.textContent = '0';
          n.node.replaceWith(el);
          setTimeout(() => countTo(el, n.value), 120 + i * 90);
        });

        // the kill lands only after the figures have settled
        setTimeout(() => {
          panel.classList.add('is-firing');
          setTimeout(() => {
            if (state) {
              state.textContent = finalState || 'Liquidated';
              state.classList.remove('stat__value--alive');
              state.classList.add('stat__value--dead', 'is-struck');
            }
            panel.classList.remove('is-firing');
            panel.classList.add('is-dead');
          }, 900);
        }, 1500);
      };

      const heroIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              run();
              heroIo.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      heroIo.observe(panel);
    }

    // ---- 4. the architecture diagram draws its proof path -------------------
    document.querySelectorAll('.diagram-frame svg').forEach((svg) => {
      const dIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            svg.classList.add('is-drawn');
            dIo.disconnect();
          });
        },
        { threshold: 0.25 }
      );
      dIo.observe(svg);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
