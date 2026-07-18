import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WebApp, createWebMemoryRouter } from "./app.js";
import { RootErrorBoundary } from "./components/root-error-boundary.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("web application shell", () => {
  test("navigates from landing to the auth boundary", async () => {
    const user = userEvent.setup();
    render(<WebApp router={createWebMemoryRouter(["/"])} />);
    expect(
      screen.getByRole("heading", { name: "Meet on Paramingle." }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("link", { name: "Create your account ↗" }),
    );
    expect(await screen.findByLabelText("Confirm password")).toBeVisible();
  });

  test("does not expose the internal unknown-country code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            countryCode: "ZZ",
            registrationEnabled: false,
            reasonCode: "not_reviewed",
          }),
      }),
    );
    render(<WebApp router={createWebMemoryRouter(["/"])} />);

    expect(
      await screen.findByText("Sign-ups are temporarily unavailable"),
    ).toBeVisible();
    expect(screen.queryByText(/ZZ/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create your account ↗" }),
    ).not.toBeInTheDocument();
  });

  test("renders authenticated desktop and mobile navigation boundaries", () => {
    render(<WebApp router={createWebMemoryRouter(["/app"])} />);
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Friends" })).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Meet someone new." }),
    ).toBeVisible();
  });

  test("replaces the premium placeholder with an honest provider state", async () => {
    render(<WebApp router={createWebMemoryRouter(["/app/premium"])} />);
    expect(
      await screen.findByRole("heading", { name: "Choose what fits." }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Billing provider unavailable" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Coming in V2" })).toBeVisible();
  });

  test("offers text fallback when video permission is denied", async () => {
    const user = userEvent.setup();
    render(
      <WebApp
        router={createWebMemoryRouter([
          "/conversation/video?permission=denied",
        ])}
      />,
    );
    expect(screen.getByText("Camera or microphone unavailable.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Use text instead" }));
    expect(
      screen.getByRole("region", { name: "text conversation preview" }),
    ).toBeVisible();
  });

  test("keeps report and report-and-leave as distinct actions", async () => {
    const user = userEvent.setup();
    render(<WebApp router={createWebMemoryRouter(["/conversation/text"])} />);
    await user.click(
      screen.getByRole("button", { name: "Report conversation" }),
    );
    expect(screen.getByRole("button", { name: "Submit report" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Submit and leave" }),
    ).toBeVisible();
  });

  test("error boundary shows a recoverable surface", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const Throw = () => {
      throw new Error("test failure");
    };
    render(
      <RootErrorBoundary>
        <Throw />
      </RootErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", { name: "Something got crossed." }),
    ).toBeVisible();
    errorSpy.mockRestore();
  });
});
