import { RequesterProvider, useRequester } from "./components/RequesterContext";
import RequesterSelection from "./components/RequesterSelection";
import AppShell from "./components/AppShell";
import CreateTicket from "./components/CreateTicket";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";

// Issue 8 — Inner component that uses the RequesterContext.
// Conditionally renders RequesterSelection or AppShell based on selectedRequester.
function AppContent() {
  const { selectedRequester, clearSelectedRequester } = useRequester();

  // AC-02: If no requester is selected, show RequesterSelection instead of AppShell
  if (!selectedRequester) {
    return <RequesterSelection />;
  }

  // If a requester is selected, show AppShell with the main app content
  return (
    <AppShell 
      requesterName={selectedRequester.name}
      onChangeRequester={clearSelectedRequester}
    >
      <CreateTicket />
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