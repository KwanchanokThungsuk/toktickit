import { useEffect, useState } from "react";
import { currentUser, logout, type AuthUser } from "./api";
import AppShell from "./components/AppShell";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import RequesterTicketDetail from "./components/RequesterTicketDetail";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [view, setView] = useState(() => window.location.hash || "#/tickets");
  useEffect(() => { currentUser().then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => {
    const onHashChange = () => setView(window.location.hash || "#/tickets");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  if (user === undefined) return <p>Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;
  if (user.mustChangePassword) return <ChangePassword user={user} onChanged={() => setUser({ ...user, mustChangePassword: false })} />;
  const showingCreateTicket = view === "#/tickets/new";
  const detailMatch = view.match(/^#\/tickets\/(\d+)$/);
  return <AppShell requesterName={user.name} onChangeRequester={async () => { await logout(); setUser(null); }} navItems={[
    { label: "My Tickets", href: "#/tickets", current: !showingCreateTicket },
    { label: "Create Ticket", href: "#/tickets/new", current: showingCreateTicket },
  ]}>
    {showingCreateTicket ? <CreateTicket /> : detailMatch ? <RequesterTicketDetail ticketId={Number(detailMatch[1])} /> : <MyTickets />}
  </AppShell>;
}
