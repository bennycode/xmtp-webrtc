# XMTP × WebRTC — E2EE Video Calls

End-to-end encrypted video calls where the **signaling itself** is encrypted via XMTP's decentralized messaging protocol.

### Encryption Layers

1. **XMTP MLS** — All signaling messages (SDP offers, answers, ICE candidates) are encrypted end-to-end using XMTP's Messaging Layer Security protocol. No server can read them.
2. **DTLS-SRTP** — WebRTC's mandatory transport encryption protects all media (audio/video) in transit.
3. **No central signaling server** — Unlike typical WebRTC apps, there is no WebSocket server that could be compromised. XMTP's decentralized network replaces it entirely.

## Architecture

```mermaid
sequenceDiagram
    participant A as Person A
    participant XMTP as XMTP Network (E2EE)
    participant B as Person B

    A->>A: Generate Ephemeral Wallet
    B->>B: Generate Ephemeral Wallet
    A->>XMTP: Create XMTP Client
    B->>XMTP: Create XMTP Client

    rect rgb(40, 40, 60)
        Note over A, B: Signaling via XMTP MLS (E2EE)
        A->>XMTP: SDP Offer
        XMTP->>B: SDP Offer
        B->>XMTP: SDP Answer
        XMTP->>A: SDP Answer
        A-->>XMTP: ICE Candidates
        XMTP-->>B: ICE Candidates
        B-->>XMTP: ICE Candidates
        XMTP-->>A: ICE Candidates
    end

    rect rgb(30, 60, 40)
        Note over A, B: WebRTC Peer Connection (DTLS-SRTP)
        A<->B: Encrypted Audio/Video Stream
    end
```

## Prerequisites

- **Node.js** 18+ (LTS recommended)

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
├── xmtp-signaling.ts     # XMTP signaling layer
└── webrtc-manager.ts     # WebRTC peer connection manager
```

## Key Files

### `xmtp-signaling.ts`
Wraps the XMTP Browser SDK to provide a signaling channel for WebRTC. Handles:
- Ephemeral wallet-to-XMTP-signer conversion
- Client creation and connection
- Sending/receiving signaling messages as XMTP DMs
- DM conversation caching for reliable ICE candidate delivery
- Streaming incoming messages

### `webrtc-manager.ts`
Manages the RTCPeerConnection lifecycle. Handles:
- Creating offers/answers
- ICE candidate exchange (via XMTP)
- Connection state tracking
- Cleanup on hangup

## XMTP Environment

By default, this app connects to the XMTP **dev** network. To use production:

```ts
// In xmtp-signaling.ts, change:
const id = await signaling.connect(xmtpSigner, "production");
```

## Limitations

- The XMTP Browser SDK is currently in **alpha** — expect breaking changes
- Both parties must have registered on XMTP before they can exchange messages
- Only one browser tab can use the XMTP Browser SDK at a time (OPFS limitation)
- STUN servers (Google) are used for NAT traversal — they see IP addresses but not media content

## License

MIT
