import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { artSvg, renderArt } from "./art";

describe("renderArt", () => {
  it("renders a JPEG at the declared size", async () => {
    const image = await renderArt({
      composition: "sea",
      palette: "dusk",
      width: 600,
      height: 400,
      seed: "t",
    });
    const meta = await sharp(image).metadata();
    expect(meta.format).toBe("jpeg");
    expect([meta.width, meta.height]).toEqual([600, 400]);
  });

  it("draws the same picture for the same seed, and a different one for another", () => {
    const spec = { composition: "ridges", palette: "winter", width: 300, height: 200 } as const;
    expect(artSvg({ ...spec, seed: "a" })).toBe(artSvg({ ...spec, seed: "a" }));
    expect(artSvg({ ...spec, seed: "a" })).not.toBe(artSvg({ ...spec, seed: "b" }));
  });
});
