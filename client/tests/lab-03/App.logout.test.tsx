import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { currentUser, logout } from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/api")>("../../src/api");
  return { ...actual, currentUser: vi.fn(), logout: vi.fn() };
});

describe("authenticated app logout", () => {
  it("clears the authenticated state and returns to Login", async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(logout).mockResolvedValue();

    render(<App />);
    const logoutButton = await screen.findByRole("button", { name: "Logout" });
    fireEvent.click(logoutButton);

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
