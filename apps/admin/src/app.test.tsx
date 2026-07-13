import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { AdminApp, createAdminMemoryRouter } from "./app.js";

describe("admin application shell", () => {
  test("keeps login separate and requires an AAL2 token", () => {
    render(<AdminApp router={createAdminMemoryRouter(["/"])} />);
    expect(
      screen.getByRole("heading", { name: "Admin access." }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open restricted workspace" }),
    ).toBeDisabled();
  });

  test("opens the purpose-limited queue only after an admin token is supplied", async () => {
    const user = userEvent.setup();
    render(<AdminApp router={createAdminMemoryRouter(["/"])} />);
    await user.type(
      screen.getByLabelText("AAL2 access token"),
      "test-aal2-token-value-long-enough",
    );
    await user.click(
      screen.getByRole("button", { name: "Open restricted workspace" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Case queue" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();
  });

  test("case route exposes a reason-gated privileged action", () => {
    render(
      <AdminApp router={createAdminMemoryRouter(["/admin/cases/preview"])} />,
    );
    expect(
      screen.getByRole("heading", { name: "Minimum necessary context." }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Apply sanction" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Documented reason")).toBeVisible();
  });
});
