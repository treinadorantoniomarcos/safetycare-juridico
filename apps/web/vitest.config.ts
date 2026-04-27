import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@safetycare/ai-contracts": path.resolve(__dirname, "../../packages/ai-contracts/src/index.ts"),
      "@safetycare/database": path.resolve(__dirname, "../../packages/database/src/index.ts"),
      "@safetycare/orchestrator": path.resolve(
        __dirname,
        "../../packages/orchestrator/src/index.ts"
      )
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
