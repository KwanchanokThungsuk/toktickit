import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { ApiError, currentUser, fetchAdminTicketInspection, fetchRequesterDashboard, fetchStaffDashboard, fetchStaffTicketDetail, fetchUsers, logout } from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/api")>("../../src/api");
  return { ...actual, currentUser: vi.fn(), fetchAdminTicketInspection: vi.fn(), fetchRequesterDashboard: vi.fn(), fetchStaffDashboard: vi.fn(), fetchStaffTicketDetail: vi.fn(), fetchUsers: vi.fn(), logout: vi.fn() };
});

describe("authenticated app logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "#/dashboard";
    vi.mocked(fetchRequesterDashboard).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchStaffDashboard).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchAdminTicketInspection).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchStaffTicketDetail).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchUsers).mockImplementation(() => new Promise(() => undefined));
  });

  const requesterDashboard = { asOf: "2026-10-10T12:00:00.000Z", window: { start: "2026-10-03T12:00:00.000Z", end: "2026-10-10T12:00:00.000Z" }, displayTimeZone: "Asia/Bangkok", metrics: { openTickets: { count: 1, drillDown: { destination: "/tickets", query: {} } }, waitingForRequester: { count: 0, drillDown: { destination: "/tickets", query: {} } }, recentlyUpdated: { count: 0, drillDown: { destination: "/tickets", query: {} } }, recentlyResolved: { count: 0, drillDown: { destination: "/tickets", query: {} } } }, attentionRequired: [], recentTickets: [], resolvedTickets: [] } as any;

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
    expect(screen.getByText("Operational access is required to view the Ticket Queue.")).toBeInTheDocument();
  });

  it("allows an Administrator to open the Staff Queue", async () => {
    window.location.hash = "#/staff/tickets";
    vi.mocked(currentUser).mockResolvedValue({ id: 2, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
  });

  it("shows the Requester dashboard navigation and keeps operational dashboards unavailable", async () => {
    window.location.hash = "#/dashboard";
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockImplementation(() => new Promise(() => undefined));
    render(<App />);
    expect(await screen.findByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "#/dashboard");
    window.location.hash = "#/staff/dashboard";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("returns to Login for initial or refreshed dashboard 401 responses", async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockRejectedValueOnce(new ApiError(401, "UNAUTHENTICATED", "expired"));
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
    unmount();

    window.location.hash = "#/dashboard";
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockResolvedValueOnce(requesterDashboard).mockRejectedValueOnce(new ApiError(401, "UNAUTHENTICATED", "expired"));
    render(<App />);
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
  });

  it("keeps the authenticated shell and shows Access denied for dashboard 403 responses", async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockRejectedValueOnce(new ApiError(403, "FORBIDDEN", "forbidden"));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
  });

  it("uses the existing forced-password flow for PASSWORD_CHANGE_REQUIRED", async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockRejectedValueOnce(new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "change password"));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
  });

  it("routes IT Staff and Administrator dashboard navigation to the shared operational dashboard", async () => {
    window.location.hash = "#/dashboard";
    vi.mocked(currentUser).mockResolvedValue({ id: 2, name: "Sam", email: "sam@example.com", role: "IT_STAFF", mustChangePassword: false });
    vi.mocked(fetchStaffDashboard).mockImplementation(() => new Promise(() => undefined));
    const { unmount } = render(<App />);
    expect(await screen.findByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "#/staff/dashboard");
    await waitFor(() => expect(window.location.hash).toBe("#/staff/dashboard"));
    unmount();

    window.location.hash = "#/dashboard";
    vi.mocked(currentUser).mockResolvedValue({ id: 3, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });
    render(<App />);
    expect(await screen.findByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "#/staff/dashboard");
    await waitFor(() => expect(window.location.hash).toBe("#/staff/dashboard"));
  });

  it("preserves valid Administrator detail routes and normalizes only an invalid route", async () => {
    for (const route of ["#/tickets/21", "#/staff/tickets/21"]) {
      window.location.hash = route;
      vi.mocked(currentUser).mockResolvedValue({ id: 3, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });
      const { unmount } = render(<App />);
      await waitFor(() => expect(window.location.hash).toBe(route));
      unmount();
    }

    window.location.hash = "#/not-a-real-route";
    vi.mocked(currentUser).mockResolvedValue({ id: 3, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/staff/dashboard"));
  });

  it("allows only Administrators to use User Management and denies direct non-Admin links", async () => {
    window.location.hash = "#/admin/users";
    vi.mocked(currentUser).mockResolvedValue({ id: 3, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });
    vi.mocked(fetchUsers).mockResolvedValue([]);
    const { unmount } = render(<App />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    unmount();

    window.location.hash = "#/admin/users";
    vi.mocked(currentUser).mockResolvedValue({ id: 2, name: "Sam", email: "sam@example.com", role: "IT_STAFF", mustChangePassword: false });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.getByText("Administrator access is required to manage users.")).toBeInTheDocument();
    unmount();

    window.location.hash = "#/admin/users";
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("normalizes a truly unknown IT Staff route to the Staff dashboard", async () => {
    window.location.hash = "#/not-a-real-route";
    vi.mocked(currentUser).mockResolvedValue({ id: 2, name: "Sam", email: "sam@example.com", role: "IT_STAFF", mustChangePassword: false });
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe("#/staff/dashboard"));
  });
});
