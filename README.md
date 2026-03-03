# XMTP × WebRTC — E2EE Video Calls

End-to-end encrypted video calls where the **signaling itself** is encrypted via XMTP's decentralized messaging protocol.

### Encryption Layers

1. **XMTP MLS** — All signaling messages (SDP offers, answers, ICE candidates) are encrypted end-to-end using XMTP's Messaging Layer Security protocol. No server can read them.
2. **DTLS-SRTP** — WebRTC's mandatory transport encryption protects all media (audio/video) in transit. Once the peer connection is established, audio and video flow directly between peers.
3. **No central signaling server** — Unlike typical WebRTC apps, there is no WebSocket server that could be compromised. XMTP's decentralized network replaces it entirely.

### What about STUN servers?

This app uses Google's public STUN servers (`stun.l.google.com`) for NAT traversal. STUN servers **do not compromise E2EE** — their only role is helping peers discover their public IP addresses so they can establish a direct connection. They never see any media content, signaling data, or message payloads.

| Component    | What it knows                                   | What it can't see                                         |
| ------------ | ----------------------------------------------- | --------------------------------------------------------- |
| STUN server  | That two IP addresses are trying to connect     | Who the users are, what they're saying, any media content |
| XMTP network | Encrypted signaling blobs between two inbox IDs | SDP/ICE content (encrypted via MLS)                       |
| No one else  | —                                               | Everything is E2EE                                        |

Even if a **TURN** relay were added (for networks where direct connections fail), DTLS-SRTP still encrypts all media — the relay would only forward opaque encrypted bytes.

## Setup

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Important:** The Vite dev server is configured with the required `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers that the XMTP Browser SDK needs for SharedArrayBuffer/WASM support.

## How to Make a Call

### Person A (Caller)

1. Open the app in Chrome/Firefox
2. Click **Connect Wallet** — an ephemeral wallet is generated instantly
3. Wait for "XMTP online" status
4. Click **Start Camera** → allow camera/mic
5. Enter Person B's XMTP inbox ID
6. Click **Call Peer**

### Person B (Callee)

1. Open the app in a separate browser/profile/device
2. Click **Connect Wallet**
3. Wait for "XMTP online" status
4. Click **Start Camera**
5. Share your XMTP inbox ID with Person A (use the copy button)
6. The incoming call is automatically detected via XMTP stream

The WebRTC connection will be established through XMTP's E2EE messaging channel.

## Project Structure

```
src/
├── main.tsx              # React entry point
├── App.tsx               # Main UI component
├── styles.css            # Styles
├── logLevel.ts           # Shared log level type
├── signalingMessage.ts   # Signaling message types
├── signalingCodec.ts     # Custom XMTP content type codec
├── xmtpSigner.ts         # Ephemeral wallet → XMTP signer
├── xmtpSignaling.ts      # XMTP signaling layer
├── connectionState.ts    # WebRTC connection state types
├── iceServers.ts         # STUN server configuration
└── webrtcManager.ts      # WebRTC peer connection manager
```

## Key Files

### `xmtpSignaling.ts`

Wraps the XMTP Browser SDK to provide a signaling channel for WebRTC. Handles:

- Client creation with custom signaling codec
- Sending/receiving signaling messages as XMTP DMs
- DM conversation caching for reliable ICE candidate delivery
- Streaming incoming messages

### `signalingCodec.ts`

Custom XMTP content type (`xmtp-webrtc.example/webrtc-signaling`) that encodes signaling messages as structured binary payloads instead of plain text.

### `webrtcManager.ts`

Manages the RTCPeerConnection lifecycle. Handles:

- Creating offers/answers
- ICE candidate exchange (via XMTP)
- Connection state tracking
- Cleanup on hangup

## XMTP Environment

By default, this app connects to the XMTP **dev** network. To use production:

```ts
// In App.tsx, change:
const id = await signaling.connect(xmtpSigner, "production");
```

## Limitations

- STUN servers (Google) are used for NAT traversal — they see IP addresses but not media content

## License

MIT
