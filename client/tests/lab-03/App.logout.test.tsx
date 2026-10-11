import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { addInternalNote, addTicketComment, ApiError, currentUser, fetchAdminTicketInspection, fetchCategories, fetchRelatedSystems, fetchRequesterDashboard, fetchStaffDashboard, fetchStaffTicketDetail, fetchTickets, fetchUsers, logout } from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/api")>("../../src/api");
  return { ...actual, addInternalNote: vi.fn(), addTicketComment: vi.fn(), currentUser: vi.fn(), fetchAdminTicketInspection: vi.fn(), fetchCategories: vi.fn(), fetchRelatedSystems: vi.fn(), fetchRequesterDashboard: vi.fn(), fetchStaffDashboard: vi.fn(), fetchStaffTicketDetail: vi.fn(), fetchTickets: vi.fn(), fetchUsers: vi.fn(), logout: vi.fn() };
});

describe("authenticated app logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "#/dashboard";
    vi.mocked(fetchRequesterDashboard).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchStaffDashboard).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchAdminTicketInspection).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchCategories).mockResolvedValue([]);
    vi.mocked(fetchRelatedSystems).mockResolvedValue([]);
    vi.mocked(fetchTickets).mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    vi.mocked(fetchStaffTicketDetail).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(fetchUsers).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(addTicketComment).mockResolvedValue({ id: 301, ticketId: 21, body: "Administrator comment", createdAt: "2026-10-10T12:00:00.000Z", author: { id: 3, name: "Admin", role: "ADMINISTRATOR" } });
    vi.mocked(addInternalNote).mockResolvedValue({ id: 302, ticketId: 21, body: "Administrator note", createdAt: "2026-10-10T12:00:00.000Z", author: { id: 3, name: "Admin", role: "ADMINISTRATOR" } });
  });

  const requesterDashboard = { asOf: "2026-10-10T12:00:00.000Z", window: { start: "2026-10-03T12:00:00.000Z", end: "2026-10-10T12:00:00.000Z" }, displayTimeZone: "Asia/Bangkok", metrics: { openTickets: { count: 1, drillDown: { destination: "/tickets", query: {} } }, waitingForRequester: { count: 0, drillDown: { destination: "/tickets", query: {} } }, recentlyUpdated: { count: 0, drillDown: { destination: "/tickets", query: {} } }, recentlyResolved: { count: 0, drillDown: { destination: "/tickets", query: {} } } }, attentionRequired: [], recentTickets: [], resolvedTickets: [] } as any;
  const operationalDetail = { id: 21, ticketNumber: "TKT-21", summary: "Urgent dashboard Ticket", description: "A complete operational Ticket description.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN", version: 1, createdAt: "2026-10-10T10:00:00.000Z", updatedAt: "2026-10-10T11:00:00.000Z", resolvedAt: null, resolutionReady: false, requester: { name: "Requester", email: "requester@example.com" }, category: { name: "Hardware" }, relatedSystem: { name: "Email" }, assignedTo: null, eligibleOwners: [], attachments: [], publicComments: [], internalNotes: [] } as any;

  it("follows Requester dashboard filters without sending conflicting list parameters", async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    vi.mocked(fetchRequesterDashboard).mockResolvedValue({ ...requesterDashboard, metrics: { ...requesterDashboard.metrics, openTickets: { count: 1, drillDown: { destination: "/tickets", query: { statusGroup: "active" } } }, recentlyResolved: { count: 1, drillDown: { destination: "/tickets", query: { recentlyResolvedFrom: requesterDashboard.window.start, recentlyResolvedTo: requesterDashboard.window.end } } } } });
    const { unmount } = render(<App />);
    await screen.findByText("Open Tickets");
    fireEvent.click(screen.getByRole("link", { name: /open tickets/i }));
    await waitFor(() => expect(window.location.hash).toBe("#/tickets?statusGroup=active"));
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ statusGroup: "active", page: 1 })));
    fireEvent.change(screen.getByRole("combobox", { name: /current status/i }), { target: { value: "WAITING_FOR_REQUESTER" } });
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ currentStatus: "WAITING_FOR_REQUESTER", statusGroup: undefined, page: 1 })));
    unmount();

    window.location.hash = "#/dashboard";
    render(<App />);
    await screen.findAllByText("Recently Resolved");
    fireEvent.click(screen.getAllByRole("link", { name: /recently resolved/i })[0]);
    await waitFor(() => expect(window.location.hash).toContain("recentlyResolvedFrom="));
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({ recentlyResolvedFrom: requesterDashboard.window.start, recentlyResolvedTo: requesterDashboard.window.end, page: 1 })));
    const recentlyResolvedRequest = vi.mocked(fetchTickets).mock.calls.at(-1)?.[0];
    expect(recentlyResolvedRequest?.sortBy).toBeUndefined();
    expect(recentlyResolvedRequest?.sortOrder).toBeUndefined();
    fireEvent.change(screen.getByRole("combobox", { name: /current status/i }), { target: { value: "WAITING_FOR_REQUESTER" } });
    await waitFor(() => expect(fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({
      currentStatus: "WAITING_FOR_REQUESTER",
      statusGroup: undefined,
      recentlyResolvedFrom: undefined,
      recentlyResolvedTo: undefined,
      page: 1,
    })));
  });

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

  it("allows an Administrator dashboard Ticket row to load operational detail and add communications while denying the Requester route", async () => {
    window.location.hash = "#/staff/dashboard";
    vi.mocked(currentUser).mockResolvedValue({ id: 3, name: "Admin", email: "admin@example.com", role: "ADMINISTRATOR", mustChangePassword: false });
    vi.mocked(fetchStaffDashboard).mockResolvedValue({ asOf: requesterDashboard.asOf, window: requesterDashboard.window, displayTimeZone: "Asia/Bangkok", metrics: { unassignedTickets: { count: 0, drillDown: { destination: "/staff/tickets", query: {} } }, myTickets: { count: 0, drillDown: { destination: "/staff/tickets", query: {} } }, recentlyUpdated: { count: 1, drillDown: { destination: "/staff/tickets", query: {} } }, myActions: { count: 0, drillDown: { destination: "/staff/dashboard/actions", query: {} } }, byStatus: {}, byItPriority: {} }, recentTickets: [{ id: 21, ticketNumber: "TKT-21", summary: "Urgent dashboard Ticket", currentStatus: "OPEN", itPriority: "HIGH", updatedAt: operationalDetail.updatedAt }], urgentTickets: [], myRecentActions: [], urgentDrillDown: { destination: "/staff/tickets", query: {} } } as any);
    vi.mocked(fetchStaffTicketDetail).mockResolvedValue(operationalDetail);
    const { unmount } = render(<App />);
    await screen.findByText("Dashboard");
    fireEvent.click(screen.getByRole("link", { name: /TKT-21/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/staff/tickets/21"));
    expect(await screen.findByText("TKT-21")).toBeInTheDocument();
    expect(fetchStaffTicketDetail).toHaveBeenCalledWith(21);
    expect(window.location.hash).toBe("#/staff/tickets/21");
    fireEvent.change(screen.getByLabelText("Add a comment"), { target: { value: "Administrator comment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    await waitFor(() => expect(addTicketComment).toHaveBeenCalledWith(21, "Administrator comment"));
    fireEvent.change(screen.getByLabelText("Add an internal note"), { target: { value: "Administrator note" } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(addInternalNote).toHaveBeenCalledWith(21, "Administrator note"));
    unmount();

    window.location.hash = "#/staff/tickets/21";
    vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com", role: "REQUESTER", mustChangePassword: false });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
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
