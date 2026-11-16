import { describe, expect, it } from "vitest";

import { demoImageKey, demoImages } from "./serve";

const BUCKET = "https://jf-apps.s3.eu-central-1.amazonaws.com";
const KEY = "classer/user-1/demo/hikes.jpg";

describe("demoImageKey", () => {
  it("reads the key from a direct bucket URL", () => {
    expect(demoImageKey(`${BUCKET}/${KEY}`)).toBe(KEY);
  });

  it("reads the key through Next's image proxy", () => {
    const proxied = `https://classer.example.com/_next/image?url=${encodeURIComponent(`${BUCKET}/${KEY}`)}&w=640&q=75`;
    expect(demoImageKey(proxied)).toBe(KEY);
  });

  it("ignores real users' images and other requests", () => {
    expect(demoImageKey(`${BUCKET}/classer/user-1/3f2a-photo.jpg`)).toBeNull();
    expect(
      demoImageKey("https://classer.example.com/_next/image?url=%2Ficons%2Fapp.png&w=64")
    ).toBeNull();
    expect(demoImageKey("https://classer.example.com/api/items")).toBeNull();
  });
});

describe("demoImages", () => {
  it("covers every image key the demo rows point at", () => {
    const images = demoImages("user-1");
    for (const key of images.keys()) expect(demoImageKey(`${BUCKET}/${key}`)).toBe(key);
    expect(images.size).toBe(12 + 12 + 40);
  });
});
