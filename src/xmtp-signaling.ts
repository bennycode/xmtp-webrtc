import { Client, IdentifierKind } from "@xmtp/browser-sdk";
import type { Signer, Identifier, Dm } from "@xmtp/browser-sdk";

export type SignalingMessage =
  | { readonly type: "offer"; readonly sdp: string }
  | { readonly type: "answer"; readonly sdp: string }
  | { readonly type: "ice-candidate"; readonly candidate: string; readonly sdpMid: string | null; readonly sdpMLineIndex: number | null }
  | { readonly type: "hangup" };

type SignalingCallback = (msg: SignalingMessage, senderInboxId: string) => void;

type XmtpEnvironment = "dev" | "production";

export function createXmtpSigner(wallet: {
  address: string;
  signMessage: (message: string) => Promise<string>;
}): Signer {
  return {
    type: "EOA" as const,
    getIdentifier: (): Identifier => ({
      identifier: wallet.address,
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const hexSig = await wallet.signMessage(message);
      return new Uint8Array(
        hexSig
          .replace(/^0x/, "")
          .match(/.{1,2}/g)!
          .map((b) => parseInt(b, 16))
      );
    },
  };
}

function isSignalingMessage(value: unknown): value is SignalingMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const { type } = value;
  return type === "offer" || type === "answer" || type === "ice-candidate" || type === "hangup";
}

export class XmtpSignaling {
  private client: Client | null = null;
  private onMessage: SignalingCallback | null = null;
  private streamAbort: AbortController | null = null;
  private readonly dmCache = new Map<string, Dm>();
  private readonly dmPending = new Map<string, Promise<Dm>>();

  async connect(signer: Signer, env: XmtpEnvironment = "dev") {
    this.client = await Client.create(signer, { env });
    return this.client.inboxId!;
  }

  getClient() {
    return this.client;
  }

  getInboxId() {
    return this.client?.inboxId;
  }

  private async getOrCreateDm(peerInboxId: string): Promise<Dm> {
    const cached = this.dmCache.get(peerInboxId);
    if (cached) return cached;

    const pending = this.dmPending.get(peerInboxId);
    if (pending) return pending;

    const promise = (async () => {
      if (!this.client) throw new Error("XMTP client not connected");

      await this.client.conversations.sync();
      const dm =
        (await this.client.conversations.getDmByInboxId(peerInboxId)) ??
        (await this.client.conversations.createDm(peerInboxId));
      this.dmCache.set(peerInboxId, dm);
      this.dmPending.delete(peerInboxId);
      return dm;
    })();

    this.dmPending.set(peerInboxId, promise);
    return promise;
  }

  async sendSignal(peerInboxId: string, message: SignalingMessage) {
    if (!this.client) throw new Error("XMTP client not connected");
    const dm = await this.getOrCreateDm(peerInboxId);
    await dm.sendText(JSON.stringify(message));
  }

  async sendSignalByAddress(peerAddress: string, message: SignalingMessage) {
    if (!this.client) throw new Error("XMTP client not connected");

    const cached = this.dmCache.get(peerAddress);
    if (cached) {
      await cached.sendText(JSON.stringify(message));
      return;
    }

    const canMessage = await Client.canMessage([
      { identifier: peerAddress, identifierKind: IdentifierKind.Ethereum },
    ]);

    if (!canMessage.get(peerAddress.toLowerCase())) {
      throw new Error(`Address ${peerAddress} is not registered on XMTP. They need to connect first.`);
    }

    const inboxId = await this.client.fetchInboxIdByIdentifier({
      identifier: peerAddress,
      identifierKind: IdentifierKind.Ethereum,
    });

    if (!inboxId) {
      throw new Error(`Could not resolve inbox ID for ${peerAddress}`);
    }

    const dm = await this.getOrCreateDm(inboxId);
    this.dmCache.set(peerAddress, dm);
    await dm.sendText(JSON.stringify(message));
  }

  async startListening(callback: SignalingCallback) {
    if (!this.client) throw new Error("XMTP client not connected");

    this.onMessage = callback;
    this.streamAbort = new AbortController();

    await this.client.conversations.sync();

    const ownInboxId = this.client.inboxId;
    await this.client.conversations.streamAllMessages({
      onValue: (decodedMessage) => {
        if (decodedMessage.senderInboxId === ownInboxId) return;

        try {
          const content =
            typeof decodedMessage.content === "string"
              ? decodedMessage.content
              : String(decodedMessage.content);

          const parsed: unknown = JSON.parse(content);

          if (isSignalingMessage(parsed)) {
            this.onMessage?.(parsed, decodedMessage.senderInboxId);
          }
        } catch {
          // Not a signaling message
        }
      },
      onError: (error) => {
        console.error("[XMTP] Stream error:", error);
      },
    });
  }

  async disconnect() {
    this.streamAbort?.abort();
    this.streamAbort = null;
    this.onMessage = null;
    this.client = null;
  }
}
