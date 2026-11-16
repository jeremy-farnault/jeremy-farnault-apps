import { DEMO_USER } from "@jf/demo/identity";
import { describe, expect, it } from "vitest";

import { withoutDemoUser } from "./recipients";

describe("withoutDemoUser", () => {
  it("leaves the demo user out of the daily check", () => {
    const recipients = [
      { userId: "jeremy", email: "someone@example.com" },
      { userId: "demo", email: DEMO_USER.email },
    ];
    expect(withoutDemoUser(recipients)).toEqual([recipients[0]]);
  });

  it("matches the demo email whatever its case or spacing", () => {
    expect(withoutDemoUser([{ email: ` ${DEMO_USER.email.toUpperCase()} ` }])).toEqual([]);
  });

  it("keeps everyone else", () => {
    const recipients = [{ email: "a@example.com" }, { email: "b@example.com" }];
    expect(withoutDemoUser(recipients)).toEqual(recipients);
  });
});
