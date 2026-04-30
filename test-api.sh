#!/bin/bash
# ═══════════════════════════════════════════════════════
#  test-api.sh – Automated test cho 5 use cases
#  Run: bash test-api.sh
#
#  Yêu cầu: backend đang chạy ở localhost:3001
# ═══════════════════════════════════════════════════════

API="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

assert() {
  local name="$1"
  local result="$2"
  if [ "$result" = "OK" ]; then
    echo -e "${GREEN}✅ $name${NC}"
    pass=$((pass+1))
  else
    echo -e "${RED}❌ $name${NC}"
    fail=$((fail+1))
  fi
}

echo "══════════════════════════════════════════════════════"
echo "  IoT-SPMS API Automated Tests"
echo "══════════════════════════════════════════════════════"

# ─── Health check ───
echo -e "\n${YELLOW}[0] Health check${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/auth/login")
[ "$HEALTH" != "000" ] && assert "Backend reachable" "OK" || { echo -e "${RED}❌ Backend không phản hồi tại $API${NC}"; exit 1; }

# ─── Login ───
echo -e "\n${YELLOW}[Auth] Login as Admin${NC}"
ADMIN_TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"hcmutId":"AD-001","password":"123456"}' | grep -oP '"accessToken":"\K[^"]+')

if [ -n "$ADMIN_TOKEN" ]; then
  assert "Admin login" "OK"
else
  echo -e "${RED}❌ Login failed (run prisma:seed first)${NC}"
  exit 1
fi

OPERATOR_TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"hcmutId":"OP-001","password":"123456"}' | grep -oP '"accessToken":"\K[^"]+')
[ -n "$OPERATOR_TOKEN" ] && assert "Operator login" "OK" || assert "Operator login" "FAIL"

STUDENT_TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"hcmutId":"2211001","password":"123456"}' | grep -oP '"accessToken":"\K[^"]+')
[ -n "$STUDENT_TOKEN" ] && assert "Student login" "OK" || assert "Student login" "FAIL"

# Test wrong password
WRONG=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"hcmutId":"AD-001","password":"wrong"}' | grep -c "Mật khẩu không đúng")
[ "$WRONG" -gt 0 ] && assert "Reject wrong password" "OK" || assert "Reject wrong password" "FAIL"

# ─── UC-1: Check-in / Check-out ───
echo -e "\n${YELLOW}[UC-1] Check-in / Check-out${NC}"
CHECKIN=$(curl -s -X POST "$API/api/parking/checkin" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfid_card":"RFID-002","gate_id":"GATE-A1"}')
echo "$CHECKIN" | grep -q '"granted":true' && assert "RFID check-in granted" "OK" || assert "RFID check-in granted" "FAIL"

# Try check-in with student token (should fail – wrong role)
DENIED=$(curl -s -X POST "$API/api/parking/checkin" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfid_card":"RFID-002","gate_id":"GATE-A1"}' -o /dev/null -w "%{http_code}")
[ "$DENIED" = "403" ] && assert "RBAC denies STUDENT for checkin" "OK" || assert "RBAC denies STUDENT" "FAIL ($DENIED)"

# Invalid RFID
INVALID=$(curl -s -X POST "$API/api/parking/checkin" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfid_card":"FAKE-999","gate_id":"GATE-A1"}')
echo "$INVALID" | grep -q '"granted":false' && assert "Reject invalid RFID" "OK" || assert "Reject invalid RFID" "FAIL"

# ─── UC-2: Visitor Tickets ───
echo -e "\n${YELLOW}[UC-2] Visitor Tickets${NC}"
TICKET=$(curl -s -X POST "$API/api/visitor/ticket" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"license_plate":"29A-99999","vehicle_type":"motorbike","visitor_name":"Test","duration_hours":2}')
TICKET_CODE=$(echo "$TICKET" | grep -oP '"ticket_code":"\K[^"]+')
[ -n "$TICKET_CODE" ] && assert "Issue visitor ticket: $TICKET_CODE" "OK" || assert "Issue visitor ticket" "FAIL"

# ─── UC-3: IoT ───
echo -e "\n${YELLOW}[UC-3] IoT Sensor & LED${NC}"
LED=$(curl -s "$API/api/iot/led/A")
echo "$LED" | grep -q '"state":' && assert "LED state computed" "OK" || assert "LED state" "FAIL"

# Sensor event (public)
SENSOR=$(curl -s -X POST "$API/api/iot/sensor" \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"SENSOR-A01","status":"occupied","is_faulty":false}')
echo "$SENSOR" | grep -q '"success":true' && assert "Sensor event accepted" "OK" || assert "Sensor event" "FAIL"

# Fault tolerance
FAULT=$(curl -s -X POST "$API/api/iot/sensor" \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"SENSOR-A02","status":"available","is_faulty":true}')
echo "$FAULT" | grep -q '"success":true' && assert "Fault tolerance accepts is_faulty" "OK" || assert "Fault tolerance" "FAIL"

# ─── UC-4: Billing ───
echo -e "\n${YELLOW}[UC-4] Billing & BKPay${NC}"
SUMMARY=$(curl -s -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/billing/me")
echo "$SUMMARY" | grep -q '"currentPeriod"' && assert "Get billing summary" "OK" || assert "Get billing summary" "FAIL"

PAY=$(curl -s -X POST -H "Authorization: Bearer $STUDENT_TOKEN" "$API/api/billing/pay/2")
echo "$PAY" | grep -qE '"(success|status)":' && assert "Trigger BKPay payment" "OK" || assert "Trigger BKPay" "FAIL"

# ─── UC-5: Admin ───
echo -e "\n${YELLOW}[UC-5] Admin & Reports${NC}"
PRICING=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/pricing")
echo "$PRICING" | grep -q '"userRole"' && assert "Get pricing list" "OK" || assert "Get pricing" "FAIL"

# Update pricing
UPDATE=$(curl -s -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_role":"STUDENT","rate_per_hour":3000,"daily_cap":35000,"is_exempt":false}' \
  "$API/api/admin/pricing")
echo "$UPDATE" | grep -q '"ratePerHour"' && assert "Update pricing" "OK" || assert "Update pricing" "FAIL"

# Logs
LOGS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/logs?limit=5")
echo "$LOGS" | grep -q '"eventType"' && assert "Get system logs" "OK" || assert "Get logs" "FAIL"

# Dashboard
DASH=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/dashboard")
echo "$DASH" | grep -q '"totalOccupied"' && assert "Dashboard stats" "OK" || assert "Dashboard" "FAIL"

# Sync DATACORE
SYNC=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "$API/api/admin/sync-datacore")
echo "$SYNC" | grep -q '"success":true' && assert "Sync DATACORE" "OK" || assert "Sync DATACORE" "FAIL"

# ─── Final ───
echo ""
echo "══════════════════════════════════════════════════════"
total=$((pass + fail))
if [ $fail -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED ($pass/$total)${NC}"
else
  echo -e "${RED}❌ $fail FAILED, $pass PASSED ($pass/$total)${NC}"
  exit 1
fi
echo "══════════════════════════════════════════════════════"
