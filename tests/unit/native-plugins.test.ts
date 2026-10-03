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
// A Capacitor plugin says so in its package.json (`"capacitor": { "ios": …, "android": … }`), whoever publishes it:
// the Google sign-in sheet (@capgo) was missing from both projects while this list only knew @capacitor/ names.
const nativeHalf = (name: string, platform: "ios" | "android") => {
  try { return Boolean((JSON.parse(read(`node_modules/${name}/package.json`)) as { capacitor?: Record<string, unknown> }).capacitor?.[platform]); }
  catch { return false; }
};
const plugins = Object.keys(pkg.dependencies).filter((name) => !PLATFORM.has(name) && (nativeHalf(name, "ios") || nativeHalf(name, "android")));

describe("native plugin registration", () => {
  it("finds the plugins it is meant to check", () => {
    expect(plugins).toEqual(expect.arrayContaining(["@revenuecat/purchases-capacitor", "@capgo/capacitor-social-login", "@capacitor-community/apple-sign-in", "@capacitor/app"]));
  });

  it("registers every plugin in the iOS Swift package", () => {
    const swift = read("ios/App/CapApp-SPM/Package.swift");
    for (const name of plugins.filter((n) => nativeHalf(n, "ios"))) expect(swift, name).toContain(`node_modules/${name}"`);
  });

  it("registers every plugin in the Android build", () => {
    const settings = read("android/capacitor.settings.gradle");
    for (const name of plugins.filter((n) => nativeHalf(n, "android"))) expect(settings, name).toContain(`node_modules/${name}/android`);
  });
});
