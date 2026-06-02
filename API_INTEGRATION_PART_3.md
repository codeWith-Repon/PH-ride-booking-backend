# Ride Flow API — Integration Guide (Part 3 of 3)

Real-time features: WebSocket layer, rider↔driver chat, and live notifications. Assumes Parts 1 & 2 are already integrated.

---

## 1. Overview

The API runs an HTTP server and a WebSocket server on the **same port**. REST endpoints stay under `/api/v1/...`. The WebSocket lives at `/ws`.

What goes over the socket:
- **Chat messages** between the rider and the driver of an active ride.
- **`notification:new`** events whenever the server creates a notification (ride accepted, completed, cancelled, SOS, etc.).
- **`ride:status`** events whenever a ride's status changes — full populated ride object included.
- **`ride:otp-verified`** when the pickup OTP is verified.

Each user can have multiple connections (browser + mobile) — the server tracks them all and fans out to every connection.

---

## 2. Connecting to the WebSocket

**URL:** `ws://<host>:5000/ws` (use `wss://` in production with TLS).

**Auth (one of, in this order):**
1. `?token=<accessToken>` query parameter (easiest for browsers).
2. `Authorization: Bearer <accessToken>` header (only available in some WS clients).
3. `accessToken` cookie (works automatically if you're on the same origin).

If the token is missing/invalid the upgrade returns **HTTP 401** and the socket never opens.

### Vanilla browser

```ts
const accessToken = getStoredAccessToken();
const ws = new WebSocket(
  `ws://localhost:5000/ws?token=${encodeURIComponent(accessToken)}`
);

ws.onopen = () => console.log("WS connected");
ws.onclose = (e) => console.log("WS closed", e.code, e.reason);
ws.onerror = (e) => console.error("WS error", e);
```

### What you'll receive immediately after connecting

```json
{ "type": "connected", "userId": "65f...", "role": "RIDER" }
```

If you don't see that frame within ~2s, the token was likely rejected (the close event will fire instead).

---

## 3. Frame protocol

Every frame is **JSON-encoded** and has a `type` field. Unknown types are echoed back as `error`.

### Client → server

| Type | Payload | Purpose |
|---|---|---|
| `ping` | — | Heartbeat (the server also auto-pings every 30s). |
| `chat:send` | `{ rideId, text }` | Send a chat message in a ride thread. Persists to DB. |
| `chat:read` | `{ rideId }` | Mark all messages addressed to the caller in this ride as read. |

### Server → client

| Type | Payload | When |
|---|---|---|
| `connected` | `{ userId, role }` | Right after auth succeeds. |
| `pong` | — | Reply to client `ping`. |
| `chat:new` | `{ rideId, message }` | A new message in a ride you participate in. Sender also gets a copy (use it to confirm send). |
| `chat:read` | `{ rideId, by, readAt }` | The other party read your messages — use to show ✓✓. |
| `notification:new` | `{ notification }` | A new notification was created for you. |
| `ride:status` | `{ rideId, rideStatus, ride }` | Ride status changed. `ride` is the full populated object. |
| `ride:otp-verified` | `{ rideId }` | Pickup OTP verified — driver UI should unlock the "Start ride" action. |
| `error` | `{ message }` | Validation / authorization error for the last client frame. |

### Heartbeat

The server WebSocket pings every 30s; the browser auto-responds with pong. If you want a client-side liveness check too, send `{"type":"ping"}` periodically and watch for `{"type":"pong"}`. If no pong arrives within ~5s, reconnect.

---

## 4. Chat: REST fallback

Use these for the **initial thread load** (the WebSocket only carries new messages going forward). Same auth as the rest of the API — cookies or `Authorization: Bearer`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/messages/ride/:rideId` | Full thread, oldest first, sender/recipient populated. |
| POST | `/messages/ride/:rideId` | Send a message (REST equivalent of `chat:send`). |
| PATCH | `/messages/ride/:rideId/read` | Mark thread read (REST equivalent of `chat:read`). |

**POST body:** `{ "text": "Hi, I'm at the gate" }` — 1 to 2000 chars.

**Server enforces:**
- Caller must be the ride's rider OR the assigned driver.
- Ride status must be `ACCEPTED` / `PICKED UP` / `IN TRANSIT`. Sending before pickup acceptance or after completion returns **400 "Chat is only available during an active ride"**.

### `IMessage` shape

```ts
{
  _id: string;
  ride: string;
  sender: {            // populated
    _id: string;
    name: string;
    role: "RIDER" | "DRIVER";
    image?: string;
  };
  recipient: { _id: string; name: string; role: string; image?: string };
  text: string;
  readAt: string | null;     // ISO date, null until other side reads
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Recommended client architecture

Use **one** WebSocket connection per browser tab and let the rest of your UI subscribe to typed events from it. Below is a minimal vanilla TS implementation you can adapt to React/Vue/Svelte.

### `socket.ts` — singleton with auto-reconnect

```ts
type Listener = (msg: any) => void;

class RideSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retry = 0;
  private url = "";

  connect(accessToken: string) {
    this.url = `${import.meta.env.VITE_WS_URL ?? "ws://localhost:5000/ws"}?token=${encodeURIComponent(accessToken)}`;
    this.open();
  }

  private open() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this.retry = 0; };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this.listeners.forEach(l => l(msg));
      } catch { /* ignore */ }
    };
    this.ws.onclose = () => {
      // exponential backoff: 1s, 2s, 4s, ..., capped at 30s
      const delay = Math.min(30_000, 1_000 * 2 ** this.retry++);
      setTimeout(() => this.open(), delay);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  send(payload: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  on(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  close() { this.ws?.close(); this.ws = null; }
}

export const rideSocket = new RideSocket();
```

### Wire it once at app boot

```ts
// after login
rideSocket.connect(accessToken);

// after logout
rideSocket.close();
```

### React hook for live notifications + toast

```tsx
import { useEffect, useState } from "react";
import { toast } from "your-toast-lib";
import { rideSocket } from "./socket";

export function useLiveNotifications() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    return rideSocket.on((msg) => {
      if (msg.type === "notification:new") {
        toast(msg.notification.title, { description: msg.notification.message });
        setUnread(n => n + 1);
      }
    });
  }, []);

  return { unread, clearUnread: () => setUnread(0) };
}
```

### React hook to mirror the live ride

```tsx
import { useEffect, useState } from "react";
import { rideSocket } from "./socket";
import { api } from "./api"; // from Part 2 §12.1

export function useCurrentRide() {
  const [ride, setRide] = useState<any>(null);

  // Initial fetch
  useEffect(() => {
    api.get("/ride/current-ride")
      .then(r => setRide(r.data.data))
      .catch(() => setRide(null));
  }, []);

  // Live updates
  useEffect(() => {
    return rideSocket.on((msg) => {
      if (msg.type === "ride:status") {
        setRide(msg.ride);
      } else if (msg.type === "ride:otp-verified" && ride && msg.rideId === ride._id) {
        setRide({ ...ride, isOtpVerified: true });
      }
    });
  }, [ride?._id]);

  return ride;
}
```

---

## 6. Chat UI integration

### Loading the thread

```ts
async function openChat(rideId: string) {
  const { data } = await api.get(`/messages/ride/${rideId}`);
  setMessages(data.data);
  // Mark everything addressed to me as read
  rideSocket.send({ type: "chat:read", rideId });
}
```

### Sending a message

Prefer the socket (instant, no HTTP round-trip):

```ts
function sendChat(rideId: string, text: string) {
  rideSocket.send({ type: "chat:send", rideId, text });
}
```

The server will fan out a `chat:new` frame to both rider and driver — including the sender. So your `onmessage` handler is the single source of truth for appending to the thread:

```ts
rideSocket.on((msg) => {
  if (msg.type === "chat:new") {
    setMessages(prev => {
      // dedupe if message already present
      if (prev.some(m => m._id === msg.message._id)) return prev;
      return [...prev, msg.message];
    });
  }
  if (msg.type === "chat:read") {
    // other side read your messages — flip ✓ → ✓✓
    setMessages(prev => prev.map(m =>
      m.sender._id !== msg.by && m.readAt == null
        ? { ...m, readAt: msg.readAt }
        : m
    ));
  }
});
```

### When chat is closed

The server returns **400 "Chat is only available during an active ride"** if you try to send a message before the ride is `ACCEPTED` or after `COMPLETED`/`CANCELLED`/`REJECTED`. Use that to render a disabled input with a hint like *"Chat is open once the driver accepts your ride."*

### Rendering tips
- Show sender on the left if `msg.sender._id !== currentUser._id`, else right.
- `readAt == null` → single check; otherwise double check.
- Auto-scroll only when the user is already at the bottom (don't yank focus away from history reading).
- Empty state: *"No messages yet. Say hi 👋"* (only when ride is active).

---

## 7. Handling lost connections

WebSockets drop on network change, suspend, etc. Two precautions in your UI:

1. **Refetch state on reconnect.** When `onopen` fires after a reconnect, call `GET /ride/current-ride` and `GET /messages/ride/:rideId` (if a chat is open) to fill in anything you missed while disconnected.
2. **Show a subtle "Reconnecting…" badge** while `ws.readyState !== OPEN`. Don't block UI — the REST endpoints still work.

```ts
let lastStatus = "OPEN";
rideSocket.on((msg) => { /* ... */ });
setInterval(() => {
  const open = rideSocket.isOpen();
  if (open && lastStatus !== "OPEN") {
    // just reconnected — refetch
    refetchRideAndChat();
  }
  lastStatus = open ? "OPEN" : "DOWN";
}, 1000);
```

(Add a small `isOpen()` getter to `RideSocket`: `return this.ws?.readyState === WebSocket.OPEN`.)

---

## 8. Triggering matrix (what causes what)

So you know exactly which frames to expect for which user action:

| Server action | Notification recipient (`notification:new`) | `ride:status` to | Other frames |
|---|---|---|---|
| `POST /ride/book` | Driver | Both rider & driver | — |
| `POST /ride/update-status` → `ACCEPTED` | Rider | Both | — |
| `POST /ride/update-status` → `REJECTED` | Rider | Both | — |
| `POST /ride/update-status` → `CANCELLED` (rider) | Driver | Both | — |
| `POST /ride/verify-otp/:rideId` | — | — | `ride:otp-verified` to both |
| `POST /ride/update-status` → `PICKED UP` | Rider | Both | — |
| `POST /ride/update-status` → `IN TRANSIT` | Rider | Both | — |
| `POST /ride/update-status` → `COMPLETED` | Rider | Both | — |
| `POST /messages/ride/:rideId` *or* `chat:send` | — | — | `chat:new` to both |
| `PATCH /messages/ride/:rideId/read` *or* `chat:read` | — | — | `chat:read` to both |
| `POST /sos/send-message/:rideId` | (emergency contacts via email) | — | — |

Anything else that calls `NotificationServices.createNotification` server-side will also flow through `notification:new` automatically — no frontend change required when new notification triggers are added later.

---

## 9. Quick checklist for the AI agent implementing this

- [ ] After login, store `accessToken` and call `rideSocket.connect(accessToken)`.
- [ ] After logout, call `rideSocket.close()`.
- [ ] Mount one global listener that routes `notification:new` → toast + unread badge.
- [ ] Mount a current-ride store; update it on `ride:status` and `ride:otp-verified`.
- [ ] On opening a chat: `GET /messages/ride/:rideId`, then send `chat:read` over WS.
- [ ] On sending a message: `rideSocket.send({ type: "chat:send", rideId, text })` — don't append locally; wait for the `chat:new` echo.
- [ ] On reconnect, refetch current ride + open chat thread.
- [ ] Disable the chat input unless `ride.rideStatus ∈ { ACCEPTED, PICKED UP, IN TRANSIT }`.

That's all. The existing REST APIs from Parts 1 & 2 are still the source of truth for historical data; WebSocket events are the source of truth for *changes* while the user is online.
