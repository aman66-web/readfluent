import { execSync } from "node:child_process";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * The commit this build came from.
 *
 * Vercel sets the sha itself, which is the case that matters: the build
 * container there has no git history to ask. Locally there is no such variable
 * and git is right there, so ask it. Either can fail — a shallow clone, a
 * tarball, a container without git — and the answer then is "dev", which is
 * honest and never breaks a build over a label.
 */
function commit(): string {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "";
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "dev";
  } catch {
    return "dev";
  }
}

/** `YYYY-MM-DD HH:MM` UTC. Deploying the same commit twice is then still two
 *  different answers, which is the question being asked when a redeploy is
 *  what somebody is waiting on.
 *
 *  Read once per build and handed on. This file is loaded again by each of
 *  the build's workers, and a build that crossed a minute gave the server's
 *  pages one time and the browser's bundle the next: the footer on Me and
 *  /health then failed to hydrate (React #418) on every load. Set on the
 *  environment the first time, every worker started after it inherits the
 *  same value. */
const builtAt = (process.env.NEXT_PUBLIC_BUILT_AT ||= new Date().toISOString().slice(0, 16).replace("T", " "));

const nextConfig: NextConfig = {
  // The floating dev badge sits on the bottom of the phone column.
  devIndicators: false,
  // Compiled into the bundle, so a browser reporting these is reporting
  // itself. See lib/build.ts.
  env: {
    NEXT_PUBLIC_BUILD: commit(),
    NEXT_PUBLIC_BUILT_AT: builtAt,
  },
  turbopack: {
    // This directory is the project, whatever happens to sit above it. Without
    // it, Turbopack infers the root by walking up looking for a lockfile, and
    // a stray package-lock.json in a parent folder makes it warn on every boot.
    root: path.resolve(process.cwd()),
  },
  // Nobody else's page may frame this one (the account and sign-in screens would be click-jackable),
  // a file is read as the type it says it is, and a link out carries only the origin.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
  // The marketing page (public/site) at /site on every host, so it can be
  // looked at on the vercel.app address before the domain is connected. A
  // marketing domain's own root reaches the same page through proxy.ts
  // (lib/site/hosts.ts). A folder in public/ is not served by its name alone.
  async rewrites() {
    return [{ source: "/site", destination: "/site/index.html" }];
  },
};

export default nextConfig;
