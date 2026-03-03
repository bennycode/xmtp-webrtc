import { IdentifierKind } from "@xmtp/browser-sdk";
import type { Signer, Identifier } from "@xmtp/browser-sdk";

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
