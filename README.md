# Smart Parking Management System — HCMUT
### Full-Stack: NestJS + Prisma + MSSQL + React + Vite + Recharts + JWT

---

## Tech Stack

| Tầng | Công nghệ | Mục đích |
|------|-----------|----------|
| **Backend** | NestJS 10 (TypeScript) | REST API + Dependency Injection |
| **ORM** | Prisma 5 | MSSQL queries + migrations |
| **Database** | MSSQL Server 2022 | SQL Server Express (local) |
| **Auth** | JWT (Passport) | Mock HCMUT_SSO + RBAC |
| **Queue** | DB-backed (Prisma) | BKPay retry mechanism |
| **Frontend** | React 18 + Vite 5 | SPA |
| **Charts** | Recharts 2 | Dashboard + Reports |
| **i18n** | react-i18next | VI/EN |

---

## Cài đặt & Chạy

### Yêu cầu
- Node.js >= 18
- SQL Server Express đang chạy (Windows service `MSSQL$SQLEXPRESS`)
- Dynamic port của SQL Express (kiểm tra bằng SQL Server Configuration Manager)

### Bước 1 — Backend

```bash
cd backend

# Tạo file .env (chỉnh port nếu SQL Express dùng port khác)
# DATABASE_URL mẫu dùng Windows Authentication:
# "sqlserver://localhost:62341;database=iot_spms;integratedSecurity=true;trustServerCertificate=true"

# Tạo database trong SQL Server
sqlcmd -S "localhost\SQLEXPRESS" -E -Q "CREATE DATABASE iot_spms"

# Cài dependencies + tạo bảng + seed data
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed

# Khởi động dev server
npm run start:dev
# → http://localhost:3001
# → http://localhost:3001/api/docs  (Swagger)
```

### Bước 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### File .env mẫu (backend/.env)

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# SQL Server Express (Windows Auth) — đổi port cho đúng với máy
DATABASE_URL="sqlserver://localhost:62341;database=iot_spms;integratedSecurity=true;trustServerCertificate=true"

JWT_SECRET=spms_hcmut_secret_key_2025_change_in_production
JWT_EXPIRES_IN=8h

BKPAY_API_KEY=mock_bkpay_secret
GATE_RESPONSE_TIMEOUT_MS=2000
IOT_UPDATE_TIMEOUT_MS=5000
```

---

## Tài khoản demo

Mật khẩu chung: **`123456`**

| HCMUT ID | Họ tên | Vai trò | Trang có thể truy cập |
|----------|--------|---------|----------------------|
| `AD-001` | Admin HCMUT | Admin | Tất cả trang |
| `OP-001` | Nguyễn Bảo Vệ | Bảo vệ | Dashboard, Bản đồ, Vé tạm thời, Người dùng |
| `GV-045` | TS. Phạm Minh | Giảng viên | Dashboard, Bản đồ, Thanh toán (miễn phí) |
| `2211001` | Nguyễn Văn An | Sinh viên | Dashboard, Bản đồ, Thanh toán cá nhân |
| `2211002` | Trần Thị Bảo | Sinh viên | Dashboard, Bản đồ, Thanh toán cá nhân |

---

## Các trang UI

| Route | Tên trang | Vai trò | Mô tả |
|-------|-----------|---------|-------|
| `/dashboard` | Dashboard | Tất cả | Thống kê tổng quan, biểu đồ tuần, hoạt động gần đây, cảnh báo hệ thống, IoT sensors |
| `/map` | Bản đồ bãi xe | Tất cả | Xem slot theo dãy, vị trí xe của bạn, đặt trước slot (sinh viên), đánh dấu lỗi (bảo vệ) |
| `/reports` | Báo cáo | Admin | Thống kê theo Tháng/Tuần/Quý/Năm, biểu đồ lượt xe, top người dùng, xuất PDF |
| `/payments` | Thanh toán | Admin, Bảo vệ | Quản lý toàn bộ giao dịch, thống kê doanh thu, xu hướng |
| `/portal` | Thanh toán cá nhân | Sinh viên, Cán bộ | Xem dư nợ, thanh toán BKPay, lịch sử gửi xe |
| `/gate` | Vé tạm thời | Admin, Bảo vệ | Cấp vé + preview vé, checkout khách |
| `/admin` | Người dùng | Admin, Bảo vệ | Quản lý user (tìm kiếm, phân trang, số dư, trạng thái), bảng giá, system log |

---

## Cấu trúc dự án

```
spms-pro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← 9 bảng MSSQL
│   │   └── seed.ts                ← Mock data (5 users, 3 zones, 148 slots)
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.service.ts
│   │   ├── common/
│   │   │   ├── decorators/        ← @Public, @Roles, @CurrentUser
│   │   │   ├── guards/            ← JWT + RBAC
│   │   │   └── filters/           ← Global error formatter
│   │   ├── modules/
│   │   │   ├── auth/              ← JWT login (mock SSO)
│   │   │   ├── parking/           ← UC-1: RFID check-in/out
│   │   │   ├── visitor/           ← UC-2: Visitor tickets
│   │   │   ├── iot/               ← UC-3: Sensor events + LED board
│   │   │   ├── billing/           ← UC-4: BKPay + retry queue
│   │   │   └── admin/             ← UC-5: Dashboard, reports, users, pricing
│   │   ├── queue/
│   │   │   └── payment-queue.service.ts
│   │   └── main.ts
│   └── .env
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── DashboardPage.tsx   ← Tổng quan hệ thống
        │   ├── ParkingMapPage.tsx  ← Bản đồ bãi xe tương tác
        │   ├── ReportsPage.tsx     ← Báo cáo thống kê
        │   ├── PaymentAdminPage.tsx← Quản lý thanh toán (admin)
        │   ├── UserPortal.tsx      ← Thanh toán cá nhân (sinh viên)
        │   ├── GateControl.tsx     ← Cấp vé tạm thời + preview
        │   ├── AdminPage.tsx       ← Quản lý người dùng + bảng giá
        │   └── LoginPage.tsx
        ├── components/Layout.tsx   ← Sidebar + routing
        ├── contexts/AuthContext.tsx
        ├── services/api.ts         ← Axios client + JWT interceptor
        └── App.tsx                 ← Routes + role guards
```

---

## API Endpoints

| Method | Path | Roles | Mô tả |
|--------|------|-------|-------|
| POST | `/api/auth/login` | Public | Đăng nhập (mock HCMUT_SSO) |
| GET | `/api/auth/me` | Auth | Thông tin user hiện tại |
| POST | `/api/parking/checkin` | OPERATOR, ADMIN | Xe vào (SLA 2s) |
| POST | `/api/parking/checkout` | OPERATOR, ADMIN | Xe ra |
| GET | `/api/parking/me/history` | Auth | Lịch sử gửi xe cá nhân |
| GET | `/api/parking/me/active` | Auth | Phiên đang gửi xe |
| POST | `/api/visitor/ticket` | OPERATOR, ADMIN | Cấp vé khách |
| POST | `/api/visitor/checkout` | OPERATOR, ADMIN | Checkout khách |
| GET | `/api/visitor/tickets` | Auth | Danh sách vé |
| POST | `/api/iot/sensor` | Public | Nhận sự kiện cảm biến (SLA 5s) |
| GET | `/api/iot/slots` | Auth | Trạng thái tất cả slot |
| GET | `/api/iot/led/:zone` | Auth | Trạng thái LED bảng bãi A/B/C |
| POST | `/api/iot/sensor/:id/fault` | OPERATOR, ADMIN | Đánh dấu cảm biến lỗi |
| GET | `/api/billing/me` | Auth | Dư nợ cá nhân |
| POST | `/api/billing/pay/:id` | Auth | Thanh toán qua BKPay |
| POST | `/api/billing/cycle` | ADMIN | Trigger billing kỳ mới |
| GET | `/api/billing/payments` | ADMIN | Tất cả giao dịch |
| GET | `/api/admin/dashboard` | Auth | Thống kê tổng quan + weekly chart |
| GET | `/api/admin/report?period=YYYY-MM` | ADMIN | Báo cáo kỳ (daily chart, top users) |
| GET | `/api/admin/users` | ADMIN, OPERATOR | Danh sách users + balance + status |
| PUT | `/api/admin/pricing` | ADMIN | Cập nhật bảng giá |
| GET | `/api/admin/logs` | ADMIN, OPERATOR | Audit log |
| POST | `/api/admin/sync-datacore` | ADMIN | Mock sync DATACORE |

---

## Database Schema (9 bảng)

```
users              → HCMUT users (role, feeTier, rfidCard, licensePlate)
parking_zones      → Bãi A, B, C
parking_slots      → 148 slot với sensorId, status, isFaulty
parking_sessions   → Log vào/ra từng lượt
visitor_tickets    → Vé khách vãng lai
payments           → Thanh toán BKPay (PENDING → SUCCESS/FAILED)
pricing_policies   → Giá theo loại user
system_logs        → Audit trail toàn bộ sự kiện
payment_jobs       → Retry queue cho BKPay
```

---

## Đặc điểm kỹ thuật

**Performance SLA**
- UC-1 RFID check-in/out: < 2 giây — backend log warning nếu vượt
- UC-3 IoT sensor update: < 5 giây — auto-flag faulty nếu timestamp cũ

**Fault Tolerance**
- Cảm biến báo `is_faulty: true` → giữ trạng thái cũ, không reset count
- Timestamp IoT > 5s → tự flag faulty
- BKPay fail → retry queue với exponential backoff (max 5 lần, 1m→2m→4m→8m→10m)

**Security**
- JWT 8h expiration, RBAC qua `@Roles()` decorator
- bcrypt password hash, DTO validation (class-validator)

**Real-time**
- IoT Dashboard polling mỗi 4s (dưới SLA 5s)
- Backend simulator tự thay đổi slot mỗi 4s

---

## Troubleshooting

**`Cannot connect to SQL Server`**
- Kiểm tra service: `Get-Service MSSQL*` trong PowerShell
- Tìm dynamic port: SQL Server Configuration Manager → TCP/IP → IPAll → TCP Dynamic Ports
- Cập nhật `DATABASE_URL` trong `.env` với port đúng

**`prisma db push` thất bại**
- Kiểm tra format: `sqlserver://HOST:PORT;database=DB;integratedSecurity=true;trustServerCertificate=true`
- Đảm bảo database `iot_spms` đã tồn tại: `sqlcmd -S "localhost\SQLEXPRESS" -E -Q "CREATE DATABASE iot_spms"`

**Frontend không kết nối Backend**
- Vite proxy đã config `/api` → `localhost:3001`
- Kiểm tra backend: `curl http://localhost:3001`

**`TS5103 ignoreDeprecations` error**
- Đã xử lý: xóa `ignoreDeprecations` và `baseUrl` khỏi `tsconfig.json`
