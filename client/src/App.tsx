import { useEffect, useState } from "react";
import { RequesterProvider, useRequester } from "./components/RequesterContext";
import RequesterSelection from "./components/RequesterSelection";
import AppShell from "./components/AppShell";
import CreateTicket from "./components/CreateTicket";
import MyTickets from "./components/MyTickets";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";

// Issue 8 — Inner component that uses the RequesterContext.
// Conditionally renders RequesterSelection or AppShell based on selectedRequester.
function AppContent() {
  const { selectedRequester, clearSelectedRequester } = useRequester();
  const [view, setView] = useState(() => window.location.hash || "#/tickets");

  useEffect(() => {
    const handleHashChange = () => setView(window.location.hash || "#/tickets");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // AC-02: If no requester is selected, show RequesterSelection instead of AppShell
  if (!selectedRequester) {
    return <RequesterSelection />;
  }

  const showingCreateTicket = view === "#/tickets/new";

  return (
    <AppShell
      requesterName={selectedRequester.name}
      onChangeRequester={clearSelectedRequester}
      navItems={[
        { label: "My Tickets", href: "#/tickets", current: !showingCreateTicket },
        { label: "Create Ticket", href: "#/tickets/new", current: showingCreateTicket },
      ]}
    >
      {showingCreateTicket ? <CreateTicket /> : <MyTickets key={selectedRequester.id} />}
    </AppShell>
  );
}

// Issue 8 — App component wraps everything in RequesterProvider.
// The provider manages the selected requester state and localStorage persistence.
export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}