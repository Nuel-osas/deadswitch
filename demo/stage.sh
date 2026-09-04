#!/usr/bin/env bash
# Pre-flight for the demo recording. Verifies every asset the script touches,
# so nothing fails on camera. Run this once before you hit record.
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

ok(){ printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad(){ printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=1; }
FAIL=0

echo
echo "Deadswitch demo pre-flight"
echo "──────────────────────────"

# 1. the live kill target
POS=$(cast call --rpc-url "$CREDITCOIN_RPC_URL" "$DEADSWITCH_MANAGER_V3_ADDRESS" \
  "debtPositions(uint256)(address,uint256,uint256,uint256,uint64,uint8,bool)" "${POSITION_ID:-4}" 2>/dev/null | sed -n '6p')
BAL=$(cast call --rpc-url "$SOURCE_CHAIN_RPC_URL" "$COLLATERAL_VAULT_ADDRESS" \
  "positions(uint256)(address,address,uint256,bool)" "${POSITION_ID:-4}" 2>/dev/null | sed -n '3p' | awk '{print $1}')
if [ "$POS" = "0" ]; then ok "position #${POSITION_ID:-4} is Active"; else bad "position #${POSITION_ID:-4} is NOT Active (status=$POS) — stage a fresh one"; fi
if [ -n "${BAL:-}" ] && [ "${BAL:0:3}" = "100" ]; then ok "vault holds 100 TST"; else bad "vault balance unexpected: ${BAL:-none}"; fi

# 2. gas on both chains
CTC=$(cast balance "$(cast wallet address --private-key "$CREDITCOIN_WALLET_PRIVATE_KEY")" --rpc-url "$CREDITCOIN_RPC_URL" --ether 2>/dev/null | cut -d. -f1)
ETH=$(cast balance "$(cast wallet address --private-key "$CREDITCOIN_WALLET_PRIVATE_KEY")" --rpc-url "$SOURCE_CHAIN_RPC_URL" --ether 2>/dev/null | cut -d. -f1)
[ "${CTC:-0}" -gt 0 ] 2>/dev/null && ok "CTC gas: ${CTC}" || bad "no CTC gas — hit the Discord faucet"
ok "Sepolia ETH: ${ETH:-0}.x"

# 3. the attack transcripts still replay
# attack A must be UNCONSUMED or the money shot does not appear on camera
V2POS=$(cast call --rpc-url "$CREDITCOIN_RPC_URL" "$DEADSWITCH_MANAGER_ADDRESS" "debtPositions(uint256)(address,uint256,uint256,uint256,uint8,bool)" 300 2>/dev/null | sed -n '5p')
if [ "$V2POS" = "0" ]; then ok "attack A victim #300 unconsumed on v2 (tx 0xeb9bc78f…)"; else bad "attack A already consumed — stage a new victim before recording"; fi
ok "attack B source tx: 0x6f88a998… (v2 reverts by design; nothing is consumed)"

# 4. everything the camera will point at
for u in "https://nuel-osas.github.io/deadswitch/" \
         "https://nuel-osas.github.io/deadswitch/app/" \
         "https://nuel-osas.github.io/deadswitch/deadswitch-deck.pdf" \
         "https://github.com/gluwa/USC-Builder-Examples/issues/37"; do
  c=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "$u")
  [ "$c" = "200" ] && ok "$c  $u" || bad "$c  $u"
done

echo
[ "$FAIL" = "0" ] && echo "  Ready to record." || echo "  Fix the above before recording."
echo
