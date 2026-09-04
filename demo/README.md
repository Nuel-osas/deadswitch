# Demo video

## Record

1. `bash demo/stage.sh` — pre-flight. Everything must be green. It specifically
   checks that the suppression attack has not been consumed, because that shot
   is single-use.
2. **⌘⇧5** on macOS → Record Selected Portion → drag a 1920x1080 region →
   Options → pick your microphone → Record. Stop with **⌘⌃Esc**.
3. Follow `demo/SCRIPT.md`. Record each section as its own take.
4. Drop the files in `demo/takes/`, named so they sort in order:
   `01-finding.mov`, `02-attack.mov`, `03-fix.mov`, `04-product.mov`,
   `05-kill.mov`, `06-evidence.mov`

## Assemble

    bash demo/assemble.sh

Produces `demo/deadswitch-demo.mp4`: title card, your takes normalised to
1080p/30fps with audio, end card. Upload unlisted to YouTube and paste the link
into the BUIDL form.

## The one-shot warning

Section 2 runs the suppression attack against position #300. **That query burns
on first use.** Once submitted, the `accepted... 100 TST, ACTIVE` line can never
be produced against that victim again. Shoot your other sections first, get
comfortable, then take that one.

If you burn it, a fresh victim takes about 10 minutes to stage: register a new
position id on both v2 and v3, have the attacker open a vault position, call
`suppress()`, and wait one attestation cycle.

## Two rules

- Never say "instant". Attestation takes 8 to 10 minutes and the judges built it.
  The wait is the finality guarantee, not lag.
- Declare every cut out loud. An undeclared cut around a latency wait is the one
  thing that reads as hiding something.
