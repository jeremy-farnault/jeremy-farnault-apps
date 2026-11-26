import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INDEXER_URL } from "../config/links";
import { UserMenu } from "./user-menu";

afterEach(cleanup);

async function openMenu(props: { plainChangelogLink?: boolean } = {}) {
  const user = userEvent.setup();
  render(<UserMenu email="visitor@example.com" onLogout={vi.fn()} {...props} />);
  await user.click(screen.getByRole("button", { name: "Open user menu" }));
  return user;
}

const row = (name: string) => screen.queryByRole("link", { name });

describe("UserMenu", () => {
  it("links All apps to Indexer", async () => {
    await openMenu();
    expect(row("All apps")?.getAttribute("href")).toBe(INDEXER_URL);
  });

  it("links Changelog to the app's changelog", async () => {
    await openMenu();
    expect(row("Changelog")?.getAttribute("href")).toBe("/changelog");
  });

  it.each(["All apps", "Changelog"])("closes when %s is chosen", async (name) => {
    const user = await openMenu();
    const link = row(name);
    if (!link) throw new Error(`no ${name} row`);
    // jsdom can't navigate: stop the click there, the menu's own handler still runs.
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    expect(row(name)).toBeNull();
  });

  it("makes Changelog a plain link when asked (Indexer)", async () => {
    await openMenu({ plainChangelogLink: true });
    expect(row("Changelog")?.getAttribute("href")).toBe("/changelog");
  });
});
