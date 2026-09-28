import { useEffect, useRef, useState } from "react";
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
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import { currentUser, logout, type AuthUser } from "./api";

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [view, setView] = useState(() => window.location.hash || "#/tickets");
  const previousAuthenticatedUserId = useRef<number | null>(null);
  useEffect(() => { currentUser().then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => {
    const onHashChange = () => setView(window.location.hash || "#/tickets");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    const isStaffRoute = view === "#/staff/tickets" || /^#\/staff\/tickets\/\d+$/.test(view);
    const isRequesterRoute = view === "#/tickets" || view === "#/tickets/new" || /^#\/tickets\/\d+$/.test(view);
    const defaultRoute = user.role === "IT_STAFF" ? "#/staff/tickets" : user.role === "REQUESTER" ? "#/tickets" : "#/admin/users";
    const isAdminRoute = view === "#/admin/users" || /^#\/tickets\/\d+$/.test(view);
    const switchedAuthenticatedUser = previousAuthenticatedUserId.current !== null && previousAuthenticatedUserId.current !== user.id;
    previousAuthenticatedUserId.current = user.id;
    const directUnauthorizedStaffRoute = !switchedAuthenticatedUser && user.role !== "IT_STAFF" && isStaffRoute;
    const shouldNormalizeRoute = (user.role === "IT_STAFF" && !isStaffRoute) || (!directUnauthorizedStaffRoute && (switchedAuthenticatedUser || !isStaffRoute) && ((user.role === "REQUESTER" && !isRequesterRoute) || (user.role === "ADMINISTRATOR" && !isAdminRoute)));
    if (shouldNormalizeRoute) {
      if (window.location.hash !== defaultRoute) window.location.hash = defaultRoute;
      setView(defaultRoute);
    }
  }, [user, view]);
  if (user === undefined) return <p>Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;
  if (user.mustChangePassword) return <ChangePassword user={user} onChanged={() => setUser({ ...user, mustChangePassword: false })} />;
  const showingCreateTicket = view === "#/tickets/new";
  const showingQueue = view === "#/staff/tickets";
  const staffDetailMatch = view.match(/^#\/staff\/tickets\/(\d+)$/);
  const detailMatch = view.match(/^#\/tickets\/(\d+)$/);
  const navItems = user.role === "ADMINISTRATOR" ? [{ label: "User Management", href: "#/admin/users", current: view === "#/admin/users" }] : user.role === "IT_STAFF" ? [
    { label: "Ticket Queue", href: "#/staff/tickets", current: showingQueue },
  ] : user.role === "REQUESTER" ? [
    { label: "My Tickets", href: "#/tickets", current: !showingCreateTicket },
    { label: "Create Ticket", href: "#/tickets/new", current: showingCreateTicket },
  ] : [];
  if (view === "#/access-denied") return <ErrorState title="Access denied" message="This area is not available for your account." />;
  if (user.role === "ADMINISTRATOR" && view === "#/admin/users") return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}><UserManagement /></AppShell>;
  if (user.role === "ADMINISTRATOR" && detailMatch) return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}><AdminTicketInspection ticketId={Number(detailMatch[1])} /></AppShell>;
  return <AppShell user={user} navItems={navItems} onLogout={async () => { await logout(); setUser(null); }}>
    {staffDetailMatch ? (user.role === "IT_STAFF" ? <StaffTicketDetail ticketId={Number(staffDetailMatch[1])} /> : <ErrorState title="Access denied" message="IT Staff access is required to view the Ticket Queue." />) : showingQueue ? (user.role === "IT_STAFF" ? <StaffTicketQueue /> : <ErrorState title="Access denied" message="IT Staff access is required to view the Ticket Queue." />) : showingCreateTicket ? <CreateTicket /> : detailMatch ? <RequesterTicketDetail ticketId={Number(detailMatch[1])} /> : <MyTickets />}
  </AppShell>;
}
