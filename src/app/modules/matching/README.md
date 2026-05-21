# Driver-Rider Matching

Picks the best available driver for a pickup location using a weighted score
over distance, rating, experience, and location-recency. Used in two ways:

1. **Auto-assign** — when the rider's `POST /ride/book` request omits `driver`,
   the ride service calls the matcher with `pickupCoordinates` and assigns the
   top driver before persisting the ride.
2. **Suggest candidates** — `POST /matching/candidates` returns a ranked list
   with per-factor score breakdown so the UI can show "why this driver."

## How it works

```
┌────────┐   pickup {lat,lng}   ┌────────────────────────┐
│ Rider  │ ───────────────────▶ │  $geoNear (≤ 8 km)     │
└────────┘                      │  online + approved     │
                                │  not on a live ride    │
                                │  lastLocationAt fresh  │
                                └──────────┬─────────────┘
                                           │ up to 50 candidates
                                           ▼
                                ┌────────────────────────┐
                                │  score each in JS      │
                                │  sort desc             │
                                │  take top N            │
                                └────────────────────────┘
```

### Score formula

```
score =
    0.55 · distanceScore   +    // closer is better
    0.20 · ratingScore     +    // (rating - 1) / 4   →  1..5 → 0..1
    0.10 · experienceScore +    // experience / 10    →  saturates at 10y
    0.15 · recencyScore         // 1 - (now - lastLocationAt) / maxStaleSeconds
```

All four factors are clamped to `[0, 1]`. Weights live in
[matching.interface.ts:33](matching.interface.ts#L33).

### Filters applied **before** scoring

- `availabilityStatus === ONLINE`
- `status === APPROVED`
- `lastLocationAt` newer than `now - maxStaleSeconds` (default **120s**)
- Within `maxRadiusKm` of pickup (default **8 km**, max 50)
- No active ride in `ACCEPTED` / `PICKED_UP` / `IN_TRANSIT`

These come from the `$geoNear` `query` and a follow-up `$lookup` into the
`rides` collection — see [matching.service.ts:54](matching.service.ts#L54-L88).

## Endpoints

All paths are prefixed with `/api/v1`. Pass JWT as `Authorization: Bearer <token>`.

| Method | Path                       | Role     | Purpose                                        |
| ------ | -------------------------- | -------- | ---------------------------------------------- |
| PATCH  | `/driver/me/location`      | DRIVER   | Heartbeat: update the driver's current point   |
| POST   | `/matching/candidates`     | any auth | Ranked list (up to 20) with score breakdown    |
| POST   | `/matching/best`           | any auth | Single best match                              |
| POST   | `/ride/book`               | any auth | Now accepts `pickupCoordinates`; auto-assigns  |

### Driver heartbeat

```bash
curl -X PATCH http://localhost:5000/api/v1/driver/me/location \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 23.7806, "lng": 90.4193 }'
```

Stores `currentLocation` as GeoJSON and stamps `lastLocationAt = now`.

### Find candidates

```bash
curl -X POST http://localhost:5000/api/v1/matching/candidates \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 23.7806,
    "lng": 90.4193,
    "maxRadiusKm": 8,
    "limit": 5,
    "maxStaleSeconds": 120
  }'
```

Response shape:

```json
{
  "data": [
    {
      "driverId": "65f...",
      "userId": "65e...",
      "name": "Alice",
      "distanceKm": 0.42,
      "rating": 4.8,
      "experience": 3,
      "secondsSinceUpdate": 6.2,
      "score": 0.87,
      "factors": {
        "distance": 0.95,
        "rating": 0.95,
        "experience": 0.30,
        "recency": 0.95
      }
    }
  ]
}
```

### Best single match

Same body shape; returns one object instead of an array. `404` if no driver
satisfies the filters.

### Auto-assign on booking

```bash
curl -X POST http://localhost:5000/api/v1/ride/book \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Dhanmondi 32",
    "pickupCoordinates": { "lat": 23.7461, "lng": 90.3742 },
    "dropLocation": "Banani",
    "distance": 7.5,
    "paymentMethod": "CASH"
  }'
```

No `driver` field needed. If you do pass `driver`, that takes precedence and the
matcher is skipped (backwards compatible).

## End-to-end manual test

You need:
- At least one rider account
- 2–3 approved, online drivers with vehicles
- Their access tokens (from `POST /api/v1/auth/login`)

### 1. Start the server

```bash
npm run dev
```

### 2. Have each driver send a heartbeat

Pick coordinates near a pickup point so the math is easy to eyeball. Example —
pickup is Dhanmondi 32 `(23.7461, 90.3742)`:

```bash
# Driver A — 0.5 km away, fresh ping
curl -X PATCH localhost:5000/api/v1/driver/me/location \
  -H "Authorization: Bearer $DRIVER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 23.7506, "lng": 90.3742 }'

# Driver B — 2 km away
curl -X PATCH localhost:5000/api/v1/driver/me/location \
  -H "Authorization: Bearer $DRIVER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 23.7641, "lng": 90.3742 }'

# Driver C — 6 km away (still within radius)
curl -X PATCH localhost:5000/api/v1/driver/me/location \
  -H "Authorization: Bearer $DRIVER_C_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 23.8000, "lng": 90.3742 }'
```

### 3. Rider asks for candidates

```bash
curl -X POST localhost:5000/api/v1/matching/candidates \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 23.7461, "lng": 90.3742 }'
```

Expect Driver A on top (best distance), then B, then C.

### 4. Rider books without picking

```bash
curl -X POST localhost:5000/api/v1/ride/book \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Dhanmondi 32",
    "pickupCoordinates": { "lat": 23.7461, "lng": 90.3742 },
    "dropLocation": "Banani",
    "distance": 7.5,
    "paymentMethod": "CASH"
  }'
```

The response's `driver` field should be Driver A's `_id`.

### 5. Verify booking flow still works with an explicit driver

```bash
curl -X POST localhost:5000/api/v1/ride/book \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver": "65f...",
    "pickupLocation": "Dhanmondi 32",
    "dropLocation": "Banani",
    "distance": 7.5,
    "paymentMethod": "CASH"
  }'
```

Matcher is bypassed — same behavior as before this feature.

## Negative tests

| Scenario                                                                 | Expected                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Rider books with no `driver` AND no `pickupCoordinates`                  | `400 pickupCoordinates are required for auto-matching ...`            |
| No drivers within radius                                                 | `404 No available drivers found near pickup location`                 |
| Best driver heartbeat older than `maxStaleSeconds`                       | They're filtered out — next-best is chosen                            |
| Best driver is currently on a ride in `ACCEPTED`/`PICKED_UP`/`IN_TRANSIT` | Filtered out via `$lookup` on `rides`                                 |
| Driver `availabilityStatus` is `OFFLINE`                                 | Filtered out                                                          |
| Driver status `PENDING` or `SUSPENDED`                                   | Filtered out                                                          |
| Non-driver hits `PATCH /driver/me/location`                              | `403 You are not permitted to view this route`                        |

Force a stale-driver test by setting `maxStaleSeconds` very small in the
candidates body — e.g. `"maxStaleSeconds": 5`, then wait 10s without a fresh
heartbeat.

## Frontend integration

### Rider — "find a ride" flow

```ts
// 1. Get the user's pickup coordinates (geolocation or map pin).
const { coords } = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
);
const pickup = { lat: coords.latitude, lng: coords.longitude };

// 2. (Optional) preview matches before booking
const previewRes = await fetch(`${API}/api/v1/matching/candidates`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ...pickup, limit: 3 })
});
const { data: candidates } = await previewRes.json();

// 3. Book — backend picks the best driver
const bookRes = await fetch(`${API}/api/v1/ride/book`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
        pickupLocation: "Dhanmondi 32",
        pickupCoordinates: pickup,
        dropLocation,
        distance,
        paymentMethod: "CASH"
    })
});
```

### Driver — background heartbeat

Drivers must publish a heartbeat while online, otherwise they get filtered out
after `maxStaleSeconds`. A web client can run this as a hidden tab background
task or a service worker; React Native is the more typical home for it.

```ts
// React example — call when driver toggles online
import { useEffect } from "react";

export function DriverHeartbeat({ token, enabled }: { token: string; enabled: boolean }) {
    useEffect(() => {
        if (!enabled) return;

        const send = (pos: GeolocationPosition) => {
            fetch(`${API}/api/v1/driver/me/location`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                })
            }).catch(console.error);
        };

        // Send immediately, then every 60s
        navigator.geolocation.getCurrentPosition(send);
        const id = setInterval(() => {
            navigator.geolocation.getCurrentPosition(send);
        }, 60_000);

        return () => clearInterval(id);
    }, [token, enabled]);

    return null;
}
```

### React Native (driver app)

```ts
import Geolocation from "@react-native-community/geolocation";

const watchId = Geolocation.watchPosition(
    (pos) => {
        fetch(`${API}/api/v1/driver/me/location`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            })
        });
    },
    console.warn,
    { enableHighAccuracy: true, distanceFilter: 25, interval: 60_000 }
);

// later:  Geolocation.clearWatch(watchId);
```

### Tuning advice

- **Heartbeat cadence** — every 30–60 seconds while idle is plenty; the GPS
  tracking feature handles per-ride high-frequency updates.
- **`maxStaleSeconds`** — keep larger than the heartbeat cadence × 1.5. With
  60s heartbeats, default `120s` is correct.
- **`maxRadiusKm`** — start at 8 km. If too few matches, the UI can offer "Try
  wider area" that retries with `maxRadiusKm: 15`.
- **Weights** — tweak the constants in [matching.interface.ts](matching.interface.ts);
  no DB changes required.

## File map

- [matching.interface.ts](matching.interface.ts) — types + `DEFAULT_WEIGHTS`
- [matching.validation.ts](matching.validation.ts) — Zod schema for request body
- [matching.service.ts](matching.service.ts) — `$geoNear` pipeline + scoring
- [matching.controller.ts](matching.controller.ts) — REST handlers
- [matching.route.ts](matching.route.ts) — REST routes
- [../driver/driver.model.ts](../driver/driver.model.ts) — `currentLocation`, `lastLocationAt`, `rating`, 2dsphere index
- [../driver/driver.service.ts](../driver/driver.service.ts) — `updateMyLocation`
- [../ride/ride.service.ts](../ride/ride.service.ts) — auto-assign branch in `createRide`
