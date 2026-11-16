import { describe, expect, it } from "vitest";

import { exists } from "./upload";

/** A stand-in S3 client whose HEAD answers with `status`. */
const s3Answering = (status: number) => ({
  send: async () => {
    if (status === 200) return {};
    // What the SDK throws for a failed HEAD: no body, so a bare name and the status.
    throw Object.assign(new Error("UnknownError"), {
      name: status === 404 ? "NotFound" : "UnknownError",
      $metadata: { httpStatusCode: status },
    });
  },
});

describe("exists", () => {
  it("is true when the object is there", async () => {
    expect(await exists(s3Answering(200) as never, "bucket", "key")).toBe(true);
  });

  it("is false for a missing object, as 404 or as 403 without list permission", async () => {
    expect(await exists(s3Answering(404) as never, "bucket", "key")).toBe(false);
    expect(await exists(s3Answering(403) as never, "bucket", "key")).toBe(false);
  });

  it("explains a wrong region instead of a bare UnknownError", async () => {
    await expect(exists(s3Answering(301) as never, "bucket", "key")).rejects.toThrow(
      /301.*another region than AWS_REGION/
    );
  });
});
