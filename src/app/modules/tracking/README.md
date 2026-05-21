# Real-time GPS Tracking

Live driver-location tracking for active rides. The driver publishes location
pings; the rider (and admin) subscribes to receive them in real time. Every ping
is persisted so the full trip path can be replayed later.

## How it works

```
┌──────────┐  tracking:location   ┌──────────────┐  tracking:update   ┌─────────┐
│  Driver  │ ───────────────────▶ │ Socket.IO +  │ ────────────────▶ │  Rider  │
│  client  │                      │  Mongo write │                    │  client │
└──────────┘                      └──────────────┘                    └─────────┘
                                         │
                                         ▼
                                  LocationPing collection
                                  (GeoJSON Point + recordedAt)
```

- Transport: **Socket.IO** (rooms scoped per ride: `ride:<rideId>`)
- Persistence: **every ping** stored in `LocationPing` (2dsphere index for geo
  queries, compound index on `ride+recordedAt` for fast latest/path lookups)
- Auth: same JWT as the REST API (`JWT_ACCESS_SECRET`)
  - **Publish** — only the driver assigned to the ride, and only while the ride
    is in `ACCEPTED` / `PICKED_UP` / `IN_TRANSIT`
  - **Subscribe** — the ride's rider, the assigned driver, or an admin

## REST endpoints

All paths are prefixed with `/api/v1/tracking`. Pass the JWT as
`Authorization: Bearer <token>` or via the `accessToken` cookie.

| Method | Path                  | Role            | Purpose                                      |
| ------ | --------------------- | --------------- | -------------------------------------------- |
| POST   | `/:rideId/location`   | DRIVER          | Publish a single location ping               |
| GET    | `/:rideId/latest`     | RIDER/DRIVER/ADMIN | Get the most recent location                 |
| GET    | `/:rideId/path`       | RIDER/DRIVER/ADMIN | Get the full path (supports `from/to/limit`) |

### Publish a ping (REST fallback)

```bash
curl -X POST http://localhost:5000/api/v1/tracking/$RIDE_ID/location \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 23.7806,
    "lng": 90.4193,
    "speed": 12.4,
    "heading": 87
  }'
```

### Get latest location

```bash
curl http://localhost:5000/api/v1/tracking/$RIDE_ID/latest \
  -H "Authorization: Bearer $RIDER_TOKEN"
```

### Get full ride path

```bash
curl "http://localhost:5000/api/v1/tracking/$RIDE_ID/path?limit=500" \
  -H "Authorization: Bearer $RIDER_TOKEN"
```

Optional query params:
- `from` — ISO date, only pings at/after this time
- `to`   — ISO date, only pings at/before this time
- `limit` — default 1000, max 5000

## Socket.IO events

Connect to the same origin as the HTTP server. Pass the JWT in the handshake
`auth.token`.

| Direction       | Event                | Payload                                                   |
| --------------- | -------------------- | --------------------------------------------------------- |
| client → server | `tracking:join`      | `{ rideId }`                                              |
| client → server | `tracking:leave`     | `{ rideId }`                                              |
| client → server | `tracking:location`  | `{ rideId, lat, lng, speed?, heading?, accuracy?, recordedAt? }` (driver only) |
| server → room   | `tracking:update`    | `{ rideId, lat, lng, speed?, heading?, accuracy?, recordedAt }` |

All client→server events accept an optional ack callback:
`(res: { ok: boolean, error?: string }) => void`.

## Testing end-to-end

You need three users in the DB: a rider, the driver assigned to the ride, and a
ride in `ACCEPTED` / `PICKED_UP` / `IN_TRANSIT` state. Grab access tokens by
logging in with each through `/api/v1/auth/login`.

### 1. Start the server

```bash
npm run dev
```

### 2. Rider subscribes (terminal A)

Save as `rider.js` and run with `node rider.js` after
`npm i -D socket.io-client`:

```js
const { io } = require("socket.io-client");

const RIDER_TOKEN = process.env.RIDER_TOKEN;
const RIDE_ID = process.env.RIDE_ID;

const socket = io("http://localhost:5000", {
    auth: { token: RIDER_TOKEN }
});

socket.on("connect", () => {
    console.log("connected as rider:", socket.id);
    socket.emit("tracking:join", { rideId: RIDE_ID }, (res) => {
        console.log("join ack:", res);
    });
});

socket.on("tracking:update", (loc) => {
    console.log("live location:", loc);
});

socket.on("connect_error", (err) => {
    console.error("connect_error:", err.message);
});
```

### 3. Driver publishes (terminal B)

Save as `driver.js`:

```js
const { io } = require("socket.io-client");

const DRIVER_TOKEN = process.env.DRIVER_TOKEN;
const RIDE_ID = process.env.RIDE_ID;

const socket = io("http://localhost:5000", {
    auth: { token: DRIVER_TOKEN }
});

socket.on("connect", () => {
    console.log("connected as driver:", socket.id);

    let lat = 23.7806;
    let lng = 90.4193;

    setInterval(() => {
        lat += 0.0001;
        lng += 0.0001;
        socket.emit(
            "tracking:location",
            { rideId: RIDE_ID, lat, lng, speed: 12, heading: 90 },
            (res) => console.log("publish ack:", res)
        );
    }, 2000);
});
```

Terminal A should print a `tracking:update` every 2 seconds.

### 4. Verify persistence

```bash
curl "http://localhost:5000/api/v1/tracking/$RIDE_ID/path?limit=20" \
  -H "Authorization: Bearer $RIDER_TOKEN"
```

You should see the pings stored in order.

## Negative tests (the auth model)

These should all be rejected — useful to confirm the guardrails:

- Driver publishes for a ride they are **not** assigned to → `404 No live ride found`
- Driver publishes for a ride in `REQUESTED` / `COMPLETED` / `CANCELLED` → `404`
- Rider tries to `tracking:location` → ack `{ ok: false, error: "Only drivers can publish location" }`
- Another rider tries to `tracking:join` someone else's ride → ack `{ ok: false, error: "You cannot subscribe to this ride" }`
- Missing / expired JWT → socket `connect_error: UNAUTHORIZED: ...`

## Frontend integration

The frontend talks to two channels:
1. **Socket.IO** for live updates (driver publishes, rider subscribes).
2. **REST** for the initial path replay when the rider opens the screen
   mid-ride, and as a fallback for poor-network drivers.

### Install

```bash
npm i socket.io-client
```

### Shared socket client (React/Next.js)

```ts
// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
    if (socket?.connected) return socket;

    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
        auth: { token },
        autoConnect: true,
        transports: ["websocket"]
    });

    return socket;
};

export const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
};
```

### Rider — subscribe and render live location

```tsx
// components/RiderTracker.tsx
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

type Location = {
    rideId: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    recordedAt: string;
};

export function RiderTracker({ rideId, token }: { rideId: string; token: string }) {
    const [location, setLocation] = useState<Location | null>(null);
    const [path, setPath] = useState<Location[]>([]);

    useEffect(() => {
        // 1. Backfill the path so far (so the map isn't empty on first paint)
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tracking/${rideId}/path`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((r) => r.json())
            .then((res) => {
                const pings = (res.data ?? []).map((p: any) => ({
                    rideId,
                    lat: p.location.coordinates[1],
                    lng: p.location.coordinates[0],
                    speed: p.speed,
                    heading: p.heading,
                    recordedAt: p.recordedAt
                }));
                setPath(pings);
                if (pings.length) setLocation(pings[pings.length - 1]);
            });

        // 2. Subscribe to live updates
        const socket = getSocket(token);

        const join = () => {
            socket.emit("tracking:join", { rideId }, (res: any) => {
                if (!res?.ok) console.error("join failed:", res?.error);
            });
        };

        if (socket.connected) join();
        else socket.once("connect", join);

        const onUpdate = (loc: Location) => {
            if (loc.rideId !== rideId) return;
            setLocation(loc);
            setPath((prev) => [...prev, loc]);
        };
        socket.on("tracking:update", onUpdate);

        return () => {
            socket.off("tracking:update", onUpdate);
            socket.emit("tracking:leave", { rideId });
        };
    }, [rideId, token]);

    if (!location) return <p>Waiting for driver location…</p>;

    return (
        <div>
            <p>Driver is at {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
            <p>Speed: {location.speed ?? 0} km/h</p>
            <p>Points received: {path.length}</p>
            {/* feed `path` into Google Maps / Mapbox / Leaflet polyline */}
        </div>
    );
}
```

### Driver — publish location from the browser

```tsx
// components/DriverPublisher.tsx
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export function DriverPublisher({ rideId, token }: { rideId: string; token: string }) {
    useEffect(() => {
        const socket = getSocket(token);

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                socket.emit(
                    "tracking:location",
                    {
                        rideId,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        speed: pos.coords.speed ?? undefined,
                        heading: pos.coords.heading ?? undefined,
                        accuracy: pos.coords.accuracy
                    },
                    (res: any) => {
                        if (!res?.ok) console.error("publish failed:", res?.error);
                    }
                );
            },
            (err) => console.error("geolocation error:", err),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [rideId, token]);

    return <p>Sharing your live location with the rider…</p>;
}
```

### React Native (driver app)

```ts
import { io } from "socket.io-client";
import Geolocation from "@react-native-community/geolocation";

const socket = io("https://api.example.com", { auth: { token } });

Geolocation.watchPosition(
    (pos) => {
        socket.emit("tracking:location", {
            rideId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy
        });
    },
    (err) => console.warn(err),
    { enableHighAccuracy: true, distanceFilter: 5, interval: 3000 }
);
```

### Practical notes

- **Throttle the driver** to ~1 ping every 2–3 seconds. The schema is happy with
  more, but you'll fill the DB fast and drain phone battery.
- **Reconnect handling** — Socket.IO auto-reconnects; on the `reconnect` event,
  re-emit `tracking:join` so the rider re-enters the ride room.
- **Token refresh** — if the access token expires mid-ride, refresh it via your
  auth flow, then call `socket.disconnect()` and `getSocket(newToken)` to
  re-handshake.
- **Map rendering** — pass `path` to a polyline (Mapbox `Source`/`Layer`,
  Google `Polyline`, Leaflet `Polyline`) and `location` to the moving marker.
- **CORS** — the socket server already allows `FRONTEND_URL` and
  `http://localhost:3000`. Add your prod origin to `envVars.FRONTEND_URL`.

## File map

- [tracking.interface.ts](tracking.interface.ts) — `ILocationPing`, GeoJSON Point
- [tracking.model.ts](tracking.model.ts) — Mongoose schema, indexes
- [tracking.validation.ts](tracking.validation.ts) — Zod schema for ping input
- [tracking.service.ts](tracking.service.ts) — permission checks + DB writes/reads
- [tracking.controller.ts](tracking.controller.ts) — REST handlers
- [tracking.route.ts](tracking.route.ts) — REST routes
- [../../socket/index.ts](../../socket/index.ts) — Socket.IO server + event handlers
