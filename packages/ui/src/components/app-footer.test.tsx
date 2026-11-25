import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GITHUB_URL, INDEXER_URL, LINKEDIN_URL } from "../config/links";
import { AppFooter, type AppFooterPlacement } from "./app-footer";

afterEach(cleanup);

const link = (name: string) => screen.queryByRole("link", { name });

function linksIn(placement: AppFooterPlacement) {
  render(<AppFooter placement={placement} />);
  return screen.getAllByRole("link").map((a) => a.getAttribute("aria-label") ?? a.textContent);
}

describe("AppFooter", () => {
  it("shows every link in an app", () => {
    expect(linksIn("app")).toEqual(["Changelog", "All apps", "GitHub", "LinkedIn"]);
  });

  it("hides the Changelog link on the changelog page", () => {
    expect(linksIn("changelog")).toEqual(["All apps", "GitHub", "LinkedIn"]);
  });

  it("hides the All apps link on Indexer", () => {
    expect(linksIn("indexer")).toEqual(["Changelog", "GitHub", "LinkedIn"]);
  });

  it.each<AppFooterPlacement>(["app", "indexer"])(
    "links Changelog to /changelog (%s)",
    (placement) => {
      render(<AppFooter placement={placement} />);
      expect(link("Changelog")?.getAttribute("href")).toBe("/changelog");
    }
  );

  it("links All apps to Indexer, in the same tab", () => {
    render(<AppFooter placement="app" />);
    const allApps = link("All apps");
    expect(allApps?.getAttribute("href")).toBe(INDEXER_URL);
    expect(allApps?.getAttribute("target")).toBeNull();
  });

  it.each([
    ["GitHub", GITHUB_URL],
    ["LinkedIn", LINKEDIN_URL],
  ])("opens %s in a new tab", (name, href) => {
    render(<AppFooter placement="app" />);
    const profile = link(name);
    expect(profile?.getAttribute("href")).toBe(href);
    expect(profile?.getAttribute("target")).toBe("_blank");
    expect(profile?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(profile?.getAttribute("title")).toBe(name);
  });

  it("points the profiles at Jérémy's GitHub and LinkedIn", () => {
    expect(GITHUB_URL).toBe("https://github.com/jeremy-farnault");
    expect(LINKEDIN_URL).toBe("https://www.linkedin.com/in/jeremyfarnault/");
  });
});
