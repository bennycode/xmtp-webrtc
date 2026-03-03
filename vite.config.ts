import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "child_process";

const commitHash = execFileSync("git", ["rev-parse", "--short", "HEAD"])
  .toString()
  .trim();

export default defineConfig({
  base: "/",
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [react()],
  server: {
    headers: {
      // Required by @xmtp/browser-sdk (uses SharedArrayBuffer via WASM)
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ["@xmtp/wasm-bindings", "@xmtp/browser-sdk"],
    include: ["@xmtp/proto"],
  },
});
