import { readFile } from "node:fs/promises";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { Dialog, Tabs, ToastRegion } from "./index.js";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open safety details
      </button>
      <Dialog onClose={() => setOpen(false)} open={open} title="Safety details">
        <p>Helpful context.</p>
      </Dialog>
    </>
  );
}

describe("shared UI primitives", () => {
  test("dialog closes and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open safety details" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(trigger).toHaveFocus();
  });

  test("dialog handles the native cancel event through React state", () => {
    render(<DialogHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open safety details" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(dialog).not.toHaveAttribute("open");
  });

  test("tabs expose selection and the active panel", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          { value: "friends", label: "Friends", panel: "Friend list" },
          { value: "requests", label: "Requests", panel: "Request inbox" },
        ]}
        label="Social views"
        onValueChange={onValueChange}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Requests" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Request inbox");
    expect(onValueChange).toHaveBeenCalledWith("requests");
  });

  test("toast region announces messages politely", () => {
    render(<ToastRegion message="Profile saved" tone="success" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Profile saved")).toBeVisible();
  });

  test("shared CSS disables nonessential motion for reduced-motion users", async () => {
    const css = await readFile("src/styles.css", "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms !important");
  });
});
