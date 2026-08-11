import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [statusData, setStatusData] = useState<{ status: string; service: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      await checkSystem();
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/health`);
      const data = await res.json();
      setStatusData(data);
      setState("success");
    } catch (err: any) {
      setErrorMessage(err?.message || "Error checking system");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success mb-3" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && statusData && (
        <div className="card p-3 mb-3 bg-light">
          <h5 className="text-success mb-2">Online</h5>
          <p className="mb-0"><strong>status:</strong> {statusData.status} | <strong>service:</strong> {statusData.service}</p>
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger" role="alert">
          <strong>Offline</strong> ({errorMessage})
        </div>
      )}
    </div>
  );
}
