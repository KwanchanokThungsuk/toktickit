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
    expect(screen.getByText("Alice")).toBeVisible();
    expect(screen.getByText("REQUESTER")).toBeVisible();
    expect(screen.getByLabelText("Signed in as Alice, REQUESTER")).toBeVisible();
    fireEvent.click(logoutButton);

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows Access denied for a Requester directly opening the Staff Queue", async () => {
    window.location.hash = "#/staff/tickets";
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.getByText("IT Staff access is required to view the Ticket Queue.")).toBeInTheDocument();
  });

  it("shows Access denied for an Administrator directly opening the Staff Queue", async () => {
    window.location.hash = "#/staff/tickets";
    vi.mocked(currentUser).mockResolvedValue({ id: 2, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.getByText("IT Staff access is required to view the Ticket Queue.")).toBeInTheDocument();
  });
});
