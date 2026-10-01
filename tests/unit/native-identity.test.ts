import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME, APP_SCHEME, BUNDLE_ID } from "@/lib/brand";

/**
 * The app's name, bundle id and URL scheme live in lib/brand.ts and are written
 * out again in capacitor.config.ts and both native projects. They have to agree
 * exactly or codesigning fails with no useful message, and a sign-in comes back
 * to an app that does not own its scheme — so they are held together here.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the native identity", () => {
  it("is the same in capacitor.config.ts as in lib/brand.ts", () => {
    const cfg = read("capacitor.config.ts");
    expect(cfg).toContain(`appId: "${BUNDLE_ID}"`);
    expect(cfg).toContain(`appName: "${APP_NAME}"`);
  });

  it("is the bundle id of the iOS project, in every build configuration", () => {
    const ids = [...read("ios/App/App.xcodeproj/project.pbxproj").matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toBe(BUNDLE_ID);
  });

  it("is the Android application id, namespace and Java package", () => {
    const gradle = read("android/app/build.gradle");
    expect(gradle).toContain(`namespace = "${BUNDLE_ID}"`);
    expect(gradle).toContain(`applicationId "${BUNDLE_ID}"`);
    const path = `android/app/src/main/java/${BUNDLE_ID.split(".").join("/")}/MainActivity.java`;
    expect(read(path)).toContain(`package ${BUNDLE_ID};`);
  });

  it("owns the sign-in URL scheme on iOS and Android", () => {
    expect(read("ios/App/App/Info.plist")).toContain(`<string>${APP_SCHEME}</string>`);
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain(`android:scheme="${APP_SCHEME}"`);
    expect(read("android/app/src/main/res/values/strings.xml")).toContain(`<string name="custom_url_scheme">${APP_SCHEME}</string>`);
  });

  it("shows the app's name on both home screens", () => {
    expect(read("ios/App/App/Info.plist")).toContain(`<string>${APP_NAME}</string>`);
    expect(read("android/app/src/main/res/values/strings.xml")).toContain(`<string name="app_name">${APP_NAME}</string>`);
  });

  it("lets the iOS WebView load the production host and nothing else but localhost", () => {
    const plist = read("ios/App/App/Info.plist");
    const url = /PRODUCTION_URL\s*=\s*"https:\/\/([^"/]+)"/.exec(read("capacitor.config.ts"));
    expect(url, "PRODUCTION_URL moved").toBeTruthy();
    const block = /<key>WKAppBoundDomains<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(plist)![1];
    const domains = [...block.matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]).sort();
    expect(domains).toEqual([url![1], "localhost"].sort());
  });
});
