# RideFlow API

A secure, scalable, modular backend for a ride-booking platform — Node.js, Express 5, TypeScript, MongoDB (Mongoose), Redis, and a native WebSocket layer for real-time ride status, chat, and driver tracking.

---

## Highlights

- **JWT auth** (access + refresh, cookie-based) with **Google OAuth** via Passport, plus email OTP verification.
- **Role-based access** — `RIDER`, `DRIVER`, `ADMIN`, `SUPER_ADMIN` — enforced per-route via `checkAuth`.
- **Full ride lifecycle** — request → match → accept → OTP-verify pickup → in-transit → complete/cancel, with fare calculation and a rolling driver rating average.
- **Auto-matching** — riders can omit a driver and let the backend pick the best nearby candidate from pickup coordinates.
- **Real-time layer** — a hand-rolled WebSocket server (`/ws`) broadcasts ride status changes, live location (both directions), and ride chat; REST endpoints exist as a fallback for every socket-driven feature.
- **Bidirectional live location** — the driver's position streams to the rider for the whole active ride (`PATCH /driver/me/location`); the rider's position streams to the driver too, but only up to pickup (`PATCH /ride/me/location`, gated to `REQUESTED`/`ACCEPTED` — stops automatically once `PICKED UP`).
- **SOS / emergency contacts** — riders can flag an active ride; admins triage reports.
- **Cloudinary uploads** for vehicle images via Multer.
- **Zod validation** on every mutating route; **MongoDB transactions** on the booking path (requires a replica set — see Local development below).
- **Redis** for OTP storage and rate-sensitive lookups.
- **Admin stats** — monthly user/driver signup trends for dashboards.

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js, Express 5, TypeScript 5.8 |
| Database | MongoDB via Mongoose 8 |
| Cache / OTP store | Redis |
| Auth | JWT (access + refresh), Passport (local + Google OAuth20) |
| Validation | Zod |
| Real-time | `ws` (raw WebSocket server, not Socket.IO despite the dependency) |
| File upload | Multer + Cloudinary |
| Email | Nodemailer (SMTP) + EJS templates |
| Dev server | `ts-node-dev` |

## Project structure

```
src/
├── app.ts                 # Express app: middleware, CORS, session, routes
├── server.ts               # HTTP server bootstrap: Mongo connect, Redis connect, WS attach, super-admin seed
├── app/
│   ├── config/              # env, Cloudinary, Multer, Passport, Redis
│   ├── middlewares/         # checkAuth, validateRequest, globalErrorHandler, notFound
│   ├── helpers/              # Mongoose/Zod error → AppError translators
│   ├── errorHelpers/         # AppError class
│   ├── utils/                # QueryBuilder, fare calc, JWT, email, response helpers, super-admin seed
│   ├── ws/                   # WebSocket server: auth, registry, broadcast, message handlers
│   ├── routes/                # mounts every module router under /api/v1
│   └── modules/
│       ├── auth/              # login, logout, refresh, password set/change/reset, Google OAuth
│       ├── user/               # registration, profile, admin user listing
│       ├── driver/             # driver profile, approval status, live location
│       ├── vehicle/            # vehicle registration + images
│       ├── ride/               # book, accept/reject, status transitions, OTP verify, rating, history
│       ├── matching/            # candidate scoring / best-match for auto-assign
│       ├── otp/                 # email OTP send/verify (Redis-backed)
│       ├── SOS/                  # emergency reports + admin contact list
│       ├── message/               # per-ride chat (REST + WS)
│       ├── notification/           # in-app notifications
│       ├── stats/                   # admin dashboard aggregates
│       └── payment/                  # payment record model (SSLCommerz/Stripe fields, no live gateway wired yet)
```

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB — **must run as a replica set** (even a single-node one) because the booking flow uses multi-document transactions. A plain standalone `mongod` will fail with `Transaction numbers are only allowed on a replica set member or mongos`.
- Redis (local or a hosted instance — used for OTP storage)

### Local development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up MongoDB as a single-node replica set:
   ```bash
   mongod --dbpath <your-data-dir> --replSet rs0
   # in another shell:
   mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: '127.0.0.1:27017'}]})"
   ```
   (If you're on the Windows MongoDB service, edit `mongod.cfg` to add `replication: { replSetName: rs0 }`, restart the service, then run the `rs.initiate` command once.)

3. Copy `.env.example`-style values into `.env` (see **Environment variables** below). For local dev, `NODE_ENV=development` is important — it relaxes cookie `secure`/`sameSite` flags so auth works over plain `http://localhost`.

4. Run the server:
   ```bash
   npm run dev       # ts-node-dev, auto-restarts on file change, http://localhost:5000
   npm run build      # tsc → dist/
   npm start           # node dist/server.js
   npm run lint
   ```

A super-admin account is auto-seeded on boot from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` if one doesn't already exist.

### Environment variables

```bash
PORT=5000
DB_URL=mongodb://localhost:27017/ride-booking
NODE_ENV=development

DEFAULT_EMERGENCY_EMAIL=someone@example.com

# JWT
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES=1d
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES=30d

BCRYPT_SALT_ROUND=10

# Super admin (auto-seeded on first boot)
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

SESSION_SECRET=...

# Must match your frontend origin — used for CORS and OAuth redirects
FRONTEND_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# SMTP (OTP + password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Redis
REDIS_HOST=...
REDIS_PORT=...
REDIS_USERNAME=default
REDIS_PASSWORD=...
```

## API overview

All routes are prefixed with `/api/v1`. This is a summary — see each module's `*.route.ts` for exact middleware/role requirements.

| Module | Base path | Notable endpoints |
|---|---|---|
| Auth | `/auth` | `POST /login`, `POST /logout`, `POST /refresh-token`, `POST /change-password`, `POST /forgot-password`, `POST /reset-password`, `GET /google`, `GET /google/callback` |
| User | `/user` | `POST /register-user`, `GET /get-me`, `GET /users` (admin), `GET /:userId` (admin), `PATCH /update` |
| Driver | `/driver` | `POST /register-driver`, `GET /drivers`, `GET /free-drivers`, `PATCH /me/location`, `GET /:driverId`, `PATCH /update/:driverId` |
| Vehicle | `/vehicle` | `POST /register` (multipart images), `GET /vehicles`, `GET /:vehicleId`, `PATCH /update/:vehicleId` |
| Ride | `/ride` | `POST /book`, `POST /verify-otp/:rideId`, `GET /rides`, `GET /current-ride`, `GET /history`, `PATCH /me/location` (rider's live position, `REQUESTED`/`ACCEPTED` only), `POST /update-status/:rideId`, `POST /:rideId/rate`, `GET /:rideId` |
| Matching | `/matching` | `POST /candidates`, `POST /best` |
| OTP | `/otp` | `POST /send`, `POST /verify` |
| SOS | `/sos` | `GET /` (admin, paginated), `POST /add-contact`, `POST /send-message/:rideId`, `PATCH /update-status/:sosId` |
| Message | `/messages` | `GET /ride/:rideId`, `POST /ride/:rideId`, `PATCH /ride/:rideId/read` |
| Notification | `/notifications` | `GET /`, `PATCH /mark-read/:notificationId`, `PATCH /mark-all-read` |
| Stats | `/stats` | `GET /monthly/user_driver`, `GET /monthly/user` |

### Ride status flow

```
REQUESTED → ACCEPTED → (OTP verified) → PICKED UP → IN TRANSIT → COMPLETED
Cancellable: Rider (REQUESTED), Driver (before pickup)
```

## WebSocket protocol

Connects at `ws://<host>/ws`, authenticated via `?token=`, `Authorization: Bearer`, or the `accessToken` cookie (checked in that order).

**Server → client frames:** `connected`, `ride:status`, `ride:otp-verified`, `location:update` (driver → rider), `rider-location:update` (rider → driver, pre-pickup only), `chat:new`, `chat:read`, `notification:new`, `error`.

**Client → server frames:** `ping`, `chat:send`, `chat:read`.

Every socket-driven feature also has a REST fallback (send message, mark read, poll current ride) so the app keeps working if the socket drops.

## Testing

No automated test suite yet (`npm test` is a placeholder). Use Postman or the paired frontend for manual verification.

## License

ISC
