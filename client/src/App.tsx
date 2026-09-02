import { useState } from "react";
import { checkSystem, Category } from "./api";
import { RequesterProvider, useRequester } from "./components/RequesterContext";
import RequesterSelection from "./components/RequesterSelection";
import AppShell from "./components/AppShell";
import Badge from "./components/Badge";
import Loading from "./components/Loading";
import ErrorState from "./components/ErrorState";
import Empty from "./components/Empty";

type UiState = "idle" | "loading" | "success" | "error";

// Issue 8 — Inner component that uses the RequesterContext.
// Conditionally renders RequesterSelection or AppShell based on selectedRequester.
function AppContent() {
  const { selectedRequester, clearSelectedRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err: any) {
      setErrorMessage(err?.message || "Error checking system");
      setState("error");
    }
  }

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
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>System Status</h1>
          <button 
            onClick={handleCheck} 
            disabled={state === "loading"}
            style={{
              padding: "0.5rem 1rem",
              background: state === "loading" ? "var(--zg-border)" : "var(--zg-primary)",
              color: state === "loading" ? "var(--zg-text-muted)" : "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: state === "loading" ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            {state === "idle" ? "Check System" : "Refresh"}
          </button>
        </div>

        {/* --- State UI Components --- */}
        {state === "loading" && <Loading message="Connecting to TokTickIT API..." />}

        {state === "error" && <ErrorState title="System Offline" message={errorMessage} />}

        {state === "success" && categories.length === 0 && (
          <Empty title="No Categories" message="System is online, but no categories were found." />
        )}

        {state === "success" && categories.length > 0 && (
          <div style={{ background: "var(--zg-surface)", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid var(--zg-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <strong style={{ color: "var(--zg-text)" }}>TokTickIT API</strong>
              <Badge variant="success">Online</Badge>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {categories.map((cat) => (
                <li key={cat.id} style={{ padding: "0.75rem", background: "var(--zg-pale)", borderRadius: "0.5rem", color: "var(--zg-text)", fontSize: "0.95rem" }}>
                  {cat.id}: {cat.name}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
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