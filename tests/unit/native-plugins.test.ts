import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every Capacitor plugin the app depends on is registered in both native
 * projects.
 *
 * `cap sync` writes these registrations, but only on the machine that runs
 * it, and nothing fails when they are missing: the app builds, launches and
 * simply has no native half for that plugin. That is how the first Android
 * build nearly shipped with no payment code at all — RevenueCat was in
 * package.json and in neither generated file.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
const PLATFORM = new Set(["@capacitor/core", "@capacitor/cli", "@capacitor/android", "@capacitor/ios"]);
const plugins = Object.keys(pkg.dependencies).filter(
  (name) => (name.startsWith("@capacitor/") && !PLATFORM.has(name)) || name === "@revenuecat/purchases-capacitor",
);

describe("native plugin registration", () => {
  it("finds the plugins it is meant to check", () => {
    expect(plugins).toContain("@revenuecat/purchases-capacitor");
  });

  it("registers every plugin in the iOS Swift package", () => {
    const swift = read("ios/App/CapApp-SPM/Package.swift");
    for (const name of plugins) expect(swift, name).toContain(`node_modules/${name}"`);
  });

  it("registers every plugin in the Android build", () => {
    const settings = read("android/capacitor.settings.gradle");
    for (const name of plugins) expect(settings, name).toContain(`node_modules/${name}/android`);
  });
});
