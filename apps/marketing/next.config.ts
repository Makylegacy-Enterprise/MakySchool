import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMonorepoEnv } from "@makyschool/shared/load-env";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadMonorepoEnv(monorepoRoot);

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@makyschool/shared", "@makyschool/ui"],
};

export default nextConfig;
