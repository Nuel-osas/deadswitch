'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancement ported verbatim from the original static page:
 * copy-to-clipboard on addresses and commands, plus nav scroll-spy.
 * Runs after mount so the markup stays server-rendered and crawlable.
 */
export default function LandingEnhancements() {
  useEffect(() => {
    (function () {
      'use strict';
      var RESET = 1200;
      var status = document.getElementById('copy-status');
    
      /* ---------- copy affordance: always writes the full string from the DOM ---------- */
      function legacyCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ta.setSelectionRange(0, text.length); } catch (e) {}
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
      }
    
      function settle(btn, ok) {
        btn.setAttribute('data-state', ok ? 'ok' : 'fail');
        btn.textContent = ok ? 'Copied' : 'Failed';
        if (status) { status.textContent = ok ? 'Copied to clipboard' : 'Copy failed'; }
        window.setTimeout(function () {
          btn.removeAttribute('data-state');
          btn.textContent = 'Copy';
        }, RESET);
      }
    
      document.addEventListener('click', function (e) {
        var t = e.target;
        var btn = t && t.closest ? t.closest('.copy[data-copy]') : null;
        if (!btn) { return; }
        var src = document.getElementById(btn.getAttribute('data-copy'));
        if (!src) { settle(btn, false); return; }
        var text = (src.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+$/, '');
        if (!text) { settle(btn, false); return; }
    
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(function () {
            settle(btn, true);
          }, function () {
            settle(btn, legacyCopy(text));
          });
        } else {
          settle(btn, legacyCopy(text));
        }
      });
    
      /* ---------- a scroll wrapper is a keyboard target only while it can actually scroll ----
         The markup keeps tabindex/role so the no-JS case still works at narrow widths; this
         removes them wherever the content fits, so no tab stop is dead and no label claims a
         scroll it lacks. */
      var wraps = [].slice.call(document.querySelectorAll('.scroll-x[tabindex]')).map(function (el) {
        return { el: el, label: el.getAttribute('aria-label') || '' };
      });
    
      function syncScrollAffordance() {
        for (var i = 0; i < wraps.length; i++) {
          var w = wraps[i];
          if (w.el.scrollWidth > w.el.clientWidth + 1) {
            w.el.setAttribute('tabindex', '0');
            w.el.setAttribute('role', 'region');
            if (w.label) { w.el.setAttribute('aria-label', w.label); }
          } else {
            w.el.removeAttribute('tabindex');
            w.el.removeAttribute('role');
            w.el.removeAttribute('aria-label');
          }
        }
      }
    
      syncScrollAffordance();
      window.addEventListener('load', syncScrollAffordance);
      var resizeTimer;
      window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(syncScrollAffordance, 150);
      });
    
      /* ---------- the mobile section disclosure closes once a section is picked ---------- */
      var navMenu = document.querySelector('.nav-menu');
      if (navMenu) {
        navMenu.addEventListener('click', function (e) {
          var a = e.target && e.target.closest ? e.target.closest('a') : null;
          if (a) { navMenu.removeAttribute('open'); }
        });
      }
    
      /* ---------- nav current-section marker ---------- */
      if ('IntersectionObserver' in window) {
        var spies = [].slice.call(document.querySelectorAll('.nav-links a[data-spy]'));
        var targets = spies.map(function (a) { return document.getElementById(a.getAttribute('data-spy')); })
                           .filter(Boolean);
        if (targets.length) {
          var visible = Object.create(null);
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
            var current = null;
            for (var i = 0; i < targets.length; i++) {
              if (visible[targets[i].id]) { current = targets[i].id; break; }
            }
            spies.forEach(function (a) {
              if (current && a.getAttribute('data-spy') === current) {
                a.setAttribute('aria-current', 'true');
              } else {
                a.removeAttribute('aria-current');
              }
            });
          }, { rootMargin: '-64px 0px -55% 0px', threshold: 0 });
          targets.forEach(function (t) { io.observe(t); });
        }
      }
    })();
  }, []);
  return null;
}
