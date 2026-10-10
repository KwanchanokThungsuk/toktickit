import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import RequesterTicketDetail from "./components/RequesterTicketDetail";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import StaffTicketQueue from "./components/StaffTicketQueue";
import StaffTicketDetail from "./components/StaffTicketDetail";
import UserManagement from "./components/UserManagement";
import AdminTicketInspection from "./components/AdminTicketInspection";
import ErrorState from "./components/ErrorState";
import { DashboardActions, RequesterDashboard, StaffDashboard } from "./components/Dashboards";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import { currentUser, logout, type AuthUser } from "./api";

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [view, setView] = useState(() => window.location.hash || "#/dashboard");
  useEffect(() => { currentUser().then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => {
    const onHashChange = () => setView(window.location.hash || "#/dashboard");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    const path = view.split("?")[0];
    const isStaffRoute = path === "#/staff/dashboard" || path === "#/staff/tickets" || path === "#/staff/dashboard/actions" || /^#\/staff\/tickets\/\d+$/.test(path);
    const isRequesterRoute = path === "#/dashboard" || path === "#/tickets" || path === "#/tickets/new" || /^#\/tickets\/\d+$/.test(path);
    const defaultRoute = user.role === "IT_STAFF" || user.role === "ADMINISTRATOR" ? "#/staff/dashboard" : "#/dashboard";
    const isAdminRoute = path === "#/staff/dashboard" || path === "#/staff/tickets" || path === "#/staff/dashboard/actions" || path === "#/admin/users" || /^#\/staff\/tickets\/\d+$/.test(path) || /^#\/tickets\/\d+$/.test(path);
    const directUnauthorizedStaffRoute = user.role === "REQUESTER" && isStaffRoute;
    const directUnauthorizedAdminRoute = user.role !== "ADMINISTRATOR" && path === "#/admin/users";
    const validRoute = user.role === "REQUESTER" ? isRequesterRoute : user.role === "IT_STAFF" ? isStaffRoute : isAdminRoute;
    const shouldNormalizeRoute = !directUnauthorizedStaffRoute && !directUnauthorizedAdminRoute && !validRoute;
    if (shouldNormalizeRoute) {
      if (window.location.hash !== defaultRoute) window.location.hash = defaultRoute;
      setView(defaultRoute);
    }
  }, [user, view]);
  if (user === undefined) return <p>Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;
  if (user.mustChangePassword) return <ChangePassword user={user} onChanged={() => setUser({ ...user, mustChangePassword: false })} />;
  const [path, queryString = ""] = view.slice(1).split("?"); const hashPath = `#${path}`; const routeQuery = Object.fromEntries(new URLSearchParams(queryString));
  const showingCreateTicket = hashPath === "#/tickets/new";
  const showingQueue = hashPath === "#/staff/tickets";
  const showingStaffDashboard = hashPath === "#/staff/dashboard";
  const showingRequesterDashboard = hashPath === "#/dashboard";
  const showingActionsDashboard = hashPath === "#/staff/dashboard/actions";
  const showingUserManagement = hashPath === "#/admin/users";
  const staffDetailMatch = hashPath.match(/^#\/staff\/tickets\/(\d+)$/);
  const detailMatch = hashPath.match(/^#\/tickets\/(\d+)$/);
  const navItems = user.role === "ADMINISTRATOR" ? [{ label: "Dashboard", href: "#/staff/dashboard", current: showingStaffDashboard }, { label: "Ticket Queue", href: "#/staff/tickets", current: showingQueue }, { label: "User Management", href: "#/admin/users", current: hashPath === "#/admin/users" }] : user.role === "IT_STAFF" ? [
    { label: "Dashboard", href: "#/staff/dashboard", current: showingStaffDashboard }, { label: "Ticket Queue", href: "#/staff/tickets", current: showingQueue },
  ] : user.role === "REQUESTER" ? [
    { label: "Dashboard", href: "#/dashboard", current: showingRequesterDashboard }, { label: "My Tickets", href: "#/tickets", current: hashPath === "#/tickets" },
    { label: "Create Ticket", href: "#/tickets/new", current: showingCreateTicket },
  ] : [];
  if (view === "#/access-denied") return <ErrorState title="Access denied" message="This area is not available for your account." />;
  const dashboardAuthHandlers = { onAuthenticationLost: () => setUser(null), onPasswordChangeRequired: () => setUser((current) => current ? { ...current, mustChangePassword: true } : current) };
  if (showingUserManagement) return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}>{user.role === "ADMINISTRATOR" ? <UserManagement /> : <ErrorState title="Access denied" message="Administrator access is required to manage users." />}</AppShell>;
  if (user.role === "ADMINISTRATOR" && detailMatch) return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}><AdminTicketInspection ticketId={Number(detailMatch[1])} /></AppShell>;
  return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}>
    {showingRequesterDashboard ? (user.role === "REQUESTER" ? <RequesterDashboard {...dashboardAuthHandlers} /> : <ErrorState title="Access denied" message="Requester access is required to view this dashboard." />) : showingStaffDashboard ? (user.role !== "REQUESTER" ? <StaffDashboard {...dashboardAuthHandlers} /> : <ErrorState title="Access denied" message="Operational access is required to view this dashboard." />) : showingActionsDashboard ? (user.role !== "REQUESTER" ? <DashboardActions query={routeQuery} {...dashboardAuthHandlers} /> : <ErrorState title="Access denied" message="Operational access is required to view Actions." />) : staffDetailMatch ? (user.role !== "REQUESTER" ? <StaffTicketDetail ticketId={Number(staffDetailMatch[1])} focusedActionId={Number(routeQuery.actionId) || undefined} /> : <ErrorState title="Access denied" message="Operational access is required to view the Ticket Queue." />) : showingQueue ? (user.role !== "REQUESTER" ? <StaffTicketQueue routeQuery={routeQuery} /> : <ErrorState title="Access denied" message="Operational access is required to view the Ticket Queue." />) : showingCreateTicket ? <CreateTicket /> : detailMatch ? (user.role === "ADMINISTRATOR" ? <AdminTicketInspection ticketId={Number(detailMatch[1])} /> : <RequesterTicketDetail ticketId={Number(detailMatch[1])} />) : <MyTickets routeQuery={routeQuery} />}
  </AppShell>;
}
