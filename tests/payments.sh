#!/usr/bin/env bash
# Phase 4 — Razorpay lifecycle battery (offline-signed test events; no live charges).
# Requires: running server (BASE), psql access, openssl, RAZORPAY_WEBHOOK_SECRET set in app env.
set -u
BASE="${BASE_URL:-http://127.0.0.1:3000}"
PSQL="psql -t -A postgresql://postgres:postgres@127.0.0.1:5432/app_db"
SECRET="${WH_SECRET:-whsec_sandbox_test_key}"
pass=0; fail=0
ok(){ if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "  PASS  $3"; else fail=$((fail+1)); echo "  FAIL  $3  [expected=$2 actual=$1]"; fi; }
sql(){ $PSQL -c "$1" 2>/dev/null | head -1 | tr -d '[:space:]'; }
sign(){ printf '%s' "$1" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}'; }
hook(){ curl -s -X POST "$BASE/api/webhooks/razorpay" -H "Content-Type: application/json" -H "x-razorpay-signature: $(sign "$2")" -H "x-razorpay-event-id: $1" -d "$2"; }
mkorder(){ curl -s -X POST "$BASE/api/checkout" -H 'Content-Type: application/json' -d "$1" | python3 -c 'import json,sys;print(json.load(sys.stdin)["orderNumber"])'; }
setf(){ sql "UPDATE orders SET razorpay_order_id='$2' WHERE order_number='$1' RETURNING order_number"; }

CFG=$(curl -s -X POST "$BASE/api/webhooks/razorpay" -H "Content-Type: application/json" -d '{"event":"ping"}' -o /dev/null -w "%{http_code}")
if [ "$CFG" = "503" ]; then echo "PREFLIGHT FAIL: RAZORPAY_WEBHOOK_SECRET missing in server env — set it and restart"; exit 2; fi
echo "■ P1 happy path + capture"
O1=$(mkorder '{"items":[{"slug":"signature-dark","qty":1}],"customer":{"email":"p1@test.in","name":"P One","phone":"9876543210","line1":"1 A St","city":"Pune","state":"MH","pincode":"411001"}}')
BEFORE=$(sql "SELECT stock FROM products WHERE slug='signature-dark'")
setf "$O1" order_T1 >/dev/null
TOTAL=$(sql "SELECT total FROM orders WHERE order_number='$O1'")
R=$(hook evt_T1 "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T1\",\"order_id\":\"order_T1\",\"amount\":$TOTAL,\"currency\":\"INR\",\"method\":\"card\",\"status\":\"captured\"}}}}")
ok "$(echo "$R" | grep -o 'paid')" "paid" "capture flips order to paid"
ok "$(sql "SELECT count(*) FROM payments WHERE razorpay_payment_id='pay_T1' AND verified=true")" "1" "verified payment row recorded"
AFTER=$(sql "SELECT stock FROM products WHERE slug='signature-dark'")
ok "$((BEFORE-AFTER))" "1" "stock deducted exactly once"
ok "$(sql "SELECT count(*) FROM inventory_reservations r JOIN orders o ON o.id=r.order_id WHERE o.order_number='$O1' AND r.released=false")" "0" "reservations released on capture"

echo "■ P2 duplicate webhook"
R=$(hook evt_T1 "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T1\",\"order_id\":\"order_T1\",\"amount\":$TOTAL,\"currency\":\"INR\",\"method\":\"card\",\"status\":\"captured\"}}}}")
ok "$(echo "$R" | grep -o 'duplicate')" "duplicate" "duplicate delivery is a no-op"
AFTER2=$(sql "SELECT stock FROM products WHERE slug='signature-dark'")
ok "$AFTER2" "$AFTER" "stock NOT double-deducted"
ok "$(sql "SELECT count(*) FROM payments WHERE razorpay_payment_id='pay_T1'")" "1" "payment ledger not duplicated"

echo "■ P3 out-of-order (order.paid first, captured later)"
O3=$(mkorder '{"items":[{"slug":"crunchy-nut","qty":2}],"customer":{"email":"p3@test.in","name":"P Three","phone":"9876543210","line1":"1 A St","city":"Pune","state":"MH","pincode":"411001"}}')
setf "$O3" order_T3 >/dev/null
T3=$(sql "SELECT total FROM orders WHERE order_number='$O3'")
hook evt_T3a "{\"event\":\"order.paid\",\"payload\":{\"order\":{\"entity\":{\"id\":\"order_T3\",\"amount\":$T3,\"amount_paid\":$T3,\"status\":\"paid\"}}}}" >/dev/null
ok "$(sql "SELECT status FROM orders WHERE order_number='$O3'")" "paid" "order.paid settles payment"
R=$(hook evt_T3b "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T3\",\"order_id\":\"order_T3\",\"amount\":$T3,\"currency\":\"INR\",\"method\":\"upi\",\"status\":\"captured\"}}}}")
ok "$(echo "$R" | grep -o 'already-processed')" "already-processed" "late capture is safely ignored"

echo "■ P4 invalid signature"
O4=$(mkorder '{"items":[{"slug":"signature-milk","qty":1}],"customer":{"email":"p4@test.in","name":"P Four","phone":"9876543210","line1":"1 A St","city":"Pune","state":"MH","pincode":"411001"}}')
setf "$O4" order_T4 >/dev/null
T4=$(sql "SELECT total FROM orders WHERE order_number='$O4'")
R=$(curl -s -X POST "$BASE/api/webhooks/razorpay" -H "Content-Type: application/json" -H "x-razorpay-signature: forgedforgedforged" -H "x-razorpay-event-id: evt_T4" -d "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T4\",\"order_id\":\"order_T4\",\"amount\":$T4,\"currency\":\"INR\"}}}}")
ok "$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin)["ok"])')" "False" "forged signature rejected"
ok "$(sql "SELECT status FROM orders WHERE order_number='$O4'")" "payment_pending" "forged event changes nothing"
ok "$(sql "SELECT count(*) FROM razorpay_webhook_events WHERE event_key='evt_T4'")" "0" "invalid events are not persisted"

echo "■ P5 amount mismatch (reconciliation quarantine)"
O5=$(mkorder '{"items":[{"slug":"pistachio-filled","qty":1}],"customer":{"email":"p5@test.in","name":"P Five","phone":"9876543210","line1":"1 A St","city":"Pune","state":"MH","pincode":"411001"}}')
setf "$O5" order_T5 >/dev/null
R=$(hook evt_T5 "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T5\",\"order_id\":\"order_T5\",\"amount\":1,\"currency\":\"INR\",\"method\":\"card\",\"status\":\"captured\"}}}}")
ok "$(echo "$R" | grep -o 'amount-mismatch')" "amount-mismatch" "wrong amount flagged for reconciliation"
ok "$(sql "SELECT status FROM orders WHERE order_number='$O5'")" "payment_pending" "order NOT fulfilled on mismatched money"

echo "■ P6 failed payment → retry-safe"
O6=$(mkorder '{"items":[{"slug":"signature-milk","qty":2}],"customer":{"email":"p6@test.in","name":"P Six","phone":"9876543210","line1":"1 A St","city":"Pune","state":"MH","pincode":"411001"}}')
setf "$O6" order_T6 >/dev/null
R=$(hook evt_T6 "{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_T6\",\"order_id\":\"order_T6\",\"amount\":99900,\"currency\":\"INR\",\"status\":\"failed\"}}}}")
ok "$(echo "$R" | grep -o 'retry-allowed')" "retry-allowed" "failure releases holds and stays payable"
ok "$(sql "SELECT count(*) FROM inventory_reservations r JOIN orders o ON o.id=r.order_id WHERE o.order_number='$O6' AND r.released=false")" "0" "holds released after decline"
ok "$(sql "SELECT status FROM orders WHERE order_number='$O6'")" "payment_pending" "order remains payable for retry"

echo "■ P7 refund event (unmatched tolerated, logged)"
R=$(hook evt_T7 "{\"event\":\"refund.processed\",\"payload\":{\"refund\":{\"entity\":{\"id\":\"rfnd_UNKNOWN\",\"payment_id\":\"pay_nowhere\",\"amount\":100,\"status\":\"processed\"}}}}")
ok "$(echo "$R" | grep -o 'refund:unmatched')" "refund:unmatched" "stray refund event handled gracefully"
ok "$(sql "SELECT count(*) FROM razorpay_webhook_events WHERE event_key='evt_T7'")" "1" "stray event still persisted for audit"

echo "■ P8 COD never exists"
ok "$(grep -rEni "cash[ _-]?on[ _-]?delivery|\bcod\b" src/app/api src/lib src/db --include=*.ts --include=*.tsx | grep -viE 'no cod|not offer|never|prohibit|do you offer' | wc -l)" "0" "no COD in API/lib/db code paths"

# cleanup
sql "DELETE FROM orders WHERE email LIKE 'p%@test.in'" >/dev/null
sql "DELETE FROM razorpay_webhook_events WHERE event_key LIKE 'evt_T%'" >/dev/null
echo "══════════════════════════════════"
echo "  $pass passed, $fail failed"
echo "══════════════════════════════════"
[ "$fail" = "0" ]
