import { useEffect, useState } from "react";
import { fetchRequesters, Requester } from "../api";
import { useRequester } from "./RequesterContext";
import Loading from "./Loading";
import ErrorState from "./ErrorState";
import Empty from "./Empty";
import FormSelect from "./FormSelect";

type FetchState = "idle" | "loading" | "success" | "error";

export default function RequesterSelection() {
  const { setSelectedRequester } = useRequester();
  const [state, setState] = useState<FetchState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function loadRequesters() {
      setState("loading");
      setErrorMessage("");
      try {
        const data = await fetchRequesters();
        setRequesters(data);
        setState("success");
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to load requesters");
        setState("error");
      }
    }
    loadRequesters();
  }, []);

  const handleSelectRequester = () => {
    if (!selectedId) return;
    const requester = requesters.find((r) => r.id === Number(selectedId));
    if (requester) {
      setSelectedRequester(requester);
    }
  };

  if (state === "loading") {
    return <Loading message="Loading active requesters…" />;
  }

  if (state === "error") {
    return (
      <ErrorState
        title="Connection Error"
        message={errorMessage}
        action={
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--zg-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Retry
          </button>
        }
      />
    );
  }

  if (requesters.length === 0) {
    return (
      <Empty
        title="No Active Requesters"
        message="There are no active requesters available in the system."
      />
    );
  }

  return (
    <div style={{ maxWidth: "500px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "var(--zg-text)" }}>
        Select Your Account
      </h2>
      <div style={{ 
        background: "var(--zg-surface)", 
        padding: "2rem", 
        borderRadius: "0.75rem", 
        border: "1px solid var(--zg-border)" 
      }}>
        <FormSelect
          id="requester-select"
          label="Development Requester"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          options={[
            { value: "", label: "Choose a requester…" },
            ...requesters.map((r) => ({
              value: String(r.id),
              label: `${r.name} (${r.email})`,
            })),
          ]}
        />
        <button
          onClick={handleSelectRequester}
          disabled={!selectedId}
          style={{
            width: "100%",
            marginTop: "1.5rem",
            padding: "0.75rem",
            background: selectedId ? "var(--zg-primary)" : "var(--zg-border)",
            color: selectedId ? "#fff" : "var(--zg-text-muted)",
            border: "none",
            borderRadius: "0.375rem",
            cursor: selectedId ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: "1rem"
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}