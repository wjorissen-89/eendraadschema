import { defineConfig } from "vitest/config";

// Eigen config, los van vite.config.ts: de build van de bron blijft ongemoeid.
export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["test/opzet.ts"],
        include: ["test/**/*.test.ts"],
    },
});
