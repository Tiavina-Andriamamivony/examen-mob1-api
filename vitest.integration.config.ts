import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/tests/integration/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    fileParallelism: false,
  },
});
