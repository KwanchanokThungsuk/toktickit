import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardActions, RequesterDashboard, StaffDashboard } from "../../src/components/Dashboards";
import { ApiError, fetchDashboardActions, fetchRequesterDashboard, fetchStaffDashboard } from "../../src/api";

vi.mock("../../src/api", async () => ({ ...(await vi.importActual<typeof import("../../src/api")>("../../src/api")), fetchRequesterDashboard: vi.fn(), fetchStaffDashboard: vi.fn(), fetchDashboardActions: vi.fn() }));

const drill = { destination: "/tickets", query: { statusGroup: "active" } };
const requesterResponse: any = { asOf: "2026-10-10T12:00:00.000Z", window: { start: "2026-10-03T12:00:00.000Z", end: "2026-10-10T12:00:00.000Z" }, displayTimeZone: "Asia/Bangkok", metrics: { openTickets: { count: 2, drillDown: drill }, waitingForRequester: { count: 1, drillDown: { destination: "/tickets", query: { currentStatus: "WAITING_FOR_REQUESTER" } } }, recentlyUpdated: { count: 3, drillDown: { destination: "/tickets", query: { updatedFrom: "2026-10-03T12:00:00.000Z", updatedTo: "2026-10-10T12:00:00.000Z", sortBy: "updatedAt", sortOrder: "desc" } } }, recentlyResolved: { count: 1, drillDown: { destination: "/tickets", query: { recentlyResolvedFrom: "2026-10-03T12:00:00.000Z", recentlyResolvedTo: "2026-10-10T12:00:00.000Z" } } } }, attentionRequired: [{ id: 1, ticketNumber: "TKT-1", summary: "Need reply", currentStatus: "WAITING_FOR_REQUESTER", updatedAt: "2026-10-10T12:00:00.000Z" }], recentTickets: [], resolvedTickets: [{ id: 2, ticketNumber: "TKT-2", summary: "Legacy", currentStatus: "RESOLVED", updatedAt: "2026-10-10T12:00:00.000Z", resolutionTime: "2026-10-10T12:00:00.000Z", resolutionTimeSource: "LEGACY_UPDATED_AT" }] };
const staffResponse: any = {
  asOf: requesterResponse.asOf, window: requesterResponse.window, displayTimeZone: "Asia/Bangkok",
  metrics: {
    unassignedTickets: { count: 1, drillDown: { destination: "/staff/tickets", query: { owner: "unassigned", statusGroup: "active" } } },
    myTickets: { count: 2, drillDown: { destination: "/staff/tickets", query: { owner: "me", statusGroup: "active" } } },
    recentlyUpdated: { count: 3, drillDown: { destination: "/staff/tickets", query: { updatedFrom: requesterResponse.window.start, updatedTo: requesterResponse.window.end, sortBy: "updatedAt", sortOrder: "desc" } } },
    myActions: { count: 1, drillDown: { destination: "/staff/dashboard/actions", query: { completedFrom: requesterResponse.window.start, completedTo: requesterResponse.window.end } } },
    byStatus: Object.fromEntries(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"].map(status => [status, { count: 0, drillDown: { destination: "/staff/tickets", query: { status } } }])),
    byItPriority: Object.fromEntries(["LOW", "MEDIUM", "HIGH"].map(priority => [priority, { count: 0, drillDown: { destination: "/staff/tickets", query: { statusGroup: "active", itPriority: priority } } }])),
  }, recentTickets: [{ id: 8, ticketNumber: "TKT-8", summary: "Recent staff ticket", currentStatus: "OPEN", itPriority: "HIGH", assignedTo: { id: 4, name: "Queue Owner", role: "IT_STAFF" }, updatedAt: requesterResponse.asOf }], urgentTickets: [], myRecentActions: [],
};

describe("Issue 31 dashboards", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders Requester metrics, returned drill-down links, Bangkok time, and legacy resolution label", async () => {
    vi.mocked(fetchRequesterDashboard).mockResolvedValue(requesterResponse);
    render(<RequesterDashboard />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getByText(/Updated .*Asia\/Bangkok/)).toBeInTheDocument();
    expect(screen.getByText("Estimated from last update")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open tickets/i })).toHaveAttribute("href", "#/tickets?statusGroup=active");
  });
  it("shows a safe error and retries the Requester request", async () => {
    vi.mocked(fetchRequesterDashboard).mockRejectedValueOnce(new Error("server secret")).mockResolvedValueOnce(requesterResponse);
    render(<RequesterDashboard />);
    expect(await screen.findByRole("heading", { name: "Unable to load dashboard" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    expect(fetchRequesterDashboard).toHaveBeenCalledTimes(2);
  });
  it("renders real zero metrics and per-section empty messages after a successful empty response", async () => {
    vi.mocked(fetchRequesterDashboard).mockResolvedValue({ ...requesterResponse, metrics: Object.fromEntries(Object.entries(requesterResponse.metrics).map(([key, metric]: any) => [key, { ...metric, count: 0 }])), attentionRequired: [], recentTickets: [], resolvedTickets: [] });
    render(<RequesterDashboard />);
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
    expect(screen.getAllByText("No matching tickets.")).toHaveLength(3);
  });
  it("shows a safe forbidden state without protected dashboard content", async () => {
    vi.mocked(fetchRequesterDashboard).mockRejectedValue(new ApiError(403, "FORBIDDEN", "internal detail"));
    render(<RequesterDashboard />);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "#/tickets");
  });
  it("preserves the complete previous response when Refresh fails", async () => {
    vi.mocked(fetchRequesterDashboard).mockResolvedValueOnce(requesterResponse).mockRejectedValueOnce(new Error("offline"));
    render(<RequesterDashboard />);
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getByText("Showing previous dashboard data because refresh failed.")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeInTheDocument(); expect(screen.getByText(/Updated .*Asia\/Bangkok/)).toBeInTheDocument();
  });
  it("removes prior protected dashboard data when a Refresh becomes forbidden", async () => {
    vi.mocked(fetchRequesterDashboard).mockResolvedValueOnce(requesterResponse).mockRejectedValueOnce(new ApiError(403, "FORBIDDEN", "expired"));
    render(<RequesterDashboard />);
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByText("Open Tickets")).not.toBeInTheDocument();
  });
  it("replaces metrics and the window together after a successful Refresh", async () => {
    const refreshed = { ...requesterResponse, asOf: "2026-10-11T12:00:00.000Z", window: { start: "2026-10-04T12:00:00.000Z", end: "2026-10-11T12:00:00.000Z" }, metrics: { ...requesterResponse.metrics, openTickets: { ...requesterResponse.metrics.openTickets, count: 7 } } };
    vi.mocked(fetchRequesterDashboard).mockResolvedValueOnce(requesterResponse).mockResolvedValueOnce(refreshed);
    render(<RequesterDashboard />);
    expect(await screen.findByText("Open Tickets")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    expect(screen.getAllByText(/Oct 11, 2026/)).toHaveLength(2);
    expect(screen.queryByText("Showing previous dashboard data because refresh failed.")).not.toBeInTheDocument();
  });
  it("renders Staff metrics, all buckets, previews, and exact drill-down metadata", async () => {
    vi.mocked(fetchStaffDashboard).mockResolvedValue(staffResponse);
    render(<StaffDashboard />);
    expect(await screen.findByText("Unassigned Tickets")).toBeInTheDocument();
    expect(screen.getByText("Tickets by Status")).toBeInTheDocument(); expect(screen.getByText("Active Tickets by IT Priority")).toBeInTheDocument();
    expect(screen.getByText("Queue Owner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /my tickets/i })).toHaveAttribute("href", "#/staff/tickets?owner=me&statusGroup=active");
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"]) {
      expect(document.querySelector(`a[href="#/staff/tickets?status=${status}"]`)).toHaveTextContent(status);
    }
    for (const priority of ["LOW", "MEDIUM", "HIGH"]) expect(document.querySelector(`a[href="#/staff/tickets?statusGroup=active&itPriority=${priority}"]`)).toHaveTextContent(priority);
  });
  it("uses dashboard action pagination returned by the API", async () => {
    vi.mocked(fetchDashboardActions).mockResolvedValue({ items: [{ id: 9, ticketId: 4, ticketNumber: "TKT-4", actionDescription: "Checked service", status: "COMPLETED", completedAt: requesterResponse.asOf, performedBy: { id: 3, name: "Staff", role: "IT_STAFF" }, followUpRequired: false }], page: 2, pageSize: 20, totalItems: 41, totalPages: 3 });
    render(<DashboardActions query={{ completedFrom: requesterResponse.window.start, completedTo: requesterResponse.window.end, page: "2" }} />);
    expect(await screen.findByText("Checked service")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /TKT-4/i })).toHaveAttribute("href", "#/staff/tickets/4?actionId=9");
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "#/staff/dashboard/actions?completedFrom=2026-10-03T12%3A00%3A00.000Z&completedTo=2026-10-10T12%3A00%3A00.000Z&page=1");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "#/staff/dashboard/actions?completedFrom=2026-10-03T12%3A00%3A00.000Z&completedTo=2026-10-10T12%3A00%3A00.000Z&page=3");
  });
});
