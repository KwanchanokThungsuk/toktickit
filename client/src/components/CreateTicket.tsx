import { FormEvent, useEffect, useRef, useState } from "react";
import { useRequester } from "./RequesterContext";
import { Category, fetchCategories, fetchRelatedSystems, RelatedSystem } from "../api";

type LoadState = "loading" | "ready" | "error";
type FormField = "category" | "relatedSystem" | "priority" | "summary" | "description";
type FormValues = Record<FormField, string>;
type ValidationErrors = Partial<Record<FormField, string>>;

const initialFormValues: FormValues = {
  category: "",
  relatedSystem: "",
  priority: "MEDIUM",
  summary: "",
  description: "",
};

const readonlyStyle = {
  backgroundColor: "var(--zg-readonly-bg)",
  border: "1px solid var(--zg-border)",
  color: "var(--zg-text)",
};

const focusStyle = {
  borderColor: "var(--zg-secondary)",
  boxShadow: "0 0 0 0.1875rem var(--zg-focus-ring)",
};

export default function CreateTicket() {
  const { selectedRequester } = useRequester();
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successTicketNumber, setSuccessTicketNumber] = useState("");
  const firstInvalidField = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);

  async function loadReferenceData() {
    setLoadState("loading");
    setErrorMessage("");

    try {
      const [categoryData, systemData] = await Promise.all([
        fetchCategories(),
        fetchRelatedSystems(),
      ]);
      setCategories(categoryData);
      setRelatedSystems(systemData);
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load ticket options");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadReferenceData();
  }, []);

  function updateField(field: FormField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setValidationErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSubmitError("");
  }

  function validateForm(): ValidationErrors {
    const errors: ValidationErrors = {};
    const summaryLength = formValues.summary.trim().length;
    const descriptionLength = formValues.description.trim().length;

    if (!formValues.category) errors.category = "Please select a category.";
    if (!formValues.relatedSystem) errors.relatedSystem = "Please select a related system.";
    if (summaryLength < 10 || summaryLength > 150) {
      errors.summary = "Summary must be between 10 and 150 characters.";
    }
    if (descriptionLength < 20 || descriptionLength > 5000) {
      errors.description = "Description must be between 20 and 5000 characters.";
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm();
    setValidationErrors(errors);

    const firstInvalid = (["category", "relatedSystem", "priority", "summary", "description"] as FormField[]).find((field) => errors[field]);
    if (firstInvalid) {
      firstInvalidField.current = document.getElementById(firstInvalid) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      firstInvalidField.current?.focus();
      return;
    }

    if (!selectedRequester) {
      setSubmitError("Select a requester before creating a ticket.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requester-Id": String(selectedRequester.id),
        },
        body: JSON.stringify({
          categoryId: Number(formValues.category),
          relatedSystemId: Number(formValues.relatedSystem),
          summary: formValues.summary.trim(),
          description: formValues.description.trim(),
          requestedPriority: formValues.priority,
        }),
      });

      if (!response.ok) {
        let message = "Unable to create ticket. Please try again.";
        try {
          const responseBody = await response.json();
          if (typeof responseBody?.error?.message === "string") {
            message = responseBody.error.message;
          } else if (typeof responseBody?.message === "string") {
            message = responseBody.message;
          }
        } catch {
          // Keep the safe fallback for non-JSON API errors.
        }
        throw new Error(message);
      }

      if (response.status !== 201) {
        throw new Error("Unable to create ticket. Please try again.");
      }

      const ticket = await response.json();
      setSuccessTicketNumber(ticket.ticketNumber);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateAnotherTicket() {
    setFormValues(initialFormValues);
    setValidationErrors({});
    setSubmitError("");
    setSuccessTicketNumber("");
  }

  function inputStyle(field: FormField) {
    return validationErrors[field]
      ? { backgroundColor: "var(--zg-error-bg)" }
      : undefined;
  }

  if (loadState === "loading") {
    return (
      <div className="container py-4" aria-live="polite">
        <div className="alert border" role="status" style={{ backgroundColor: "var(--zg-pale)", borderColor: "var(--zg-border)" }}>
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Loading ticket options...
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="container py-4">
        <div className="alert" role="alert" style={{ backgroundColor: "var(--zg-error-bg)", borderColor: "var(--zg-error)", color: "var(--zg-error)" }}>
          <h1 className="h5">Unable to load ticket options</h1>
          <p>{errorMessage}</p>
          <button type="button" className="btn" onClick={() => void loadReferenceData()} style={{ color: "var(--zg-error)", borderColor: "var(--zg-error)" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (successTicketNumber) {
    return (
      <div className="container py-4" style={{ maxWidth: "960px", color: "var(--zg-text)" }}>
        <section className="rounded-3 p-4 text-center" aria-labelledby="ticket-created-heading" style={{ backgroundColor: "var(--zg-pale)", border: "1px solid var(--zg-border)" }}>
          <div className="fs-1 mb-2" aria-hidden="true">✓</div>
          <h1 id="ticket-created-heading" className="h3">Ticket created</h1>
          <p style={{ color: "var(--zg-text-muted)" }}>Your support request has been submitted.</p>
          <p className="fs-4 fw-semibold">{successTicketNumber}</p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <button type="button" className="btn btn-success" style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}>
              View Ticket
            </button>
            <button type="button" className="btn btn-outline-success" onClick={handleCreateAnotherTicket} style={{ color: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}>
              Create Another Ticket
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "960px", color: "var(--zg-text)" }}>
      <header className="mb-4">
        <h1 className="h2 mb-1">Create Ticket</h1>
        <p className="mb-0" style={{ color: "var(--zg-text-muted)" }}>Submit a support request to the IT team.</p>
      </header>

      <form className="bg-white border rounded-3 shadow-sm p-4" style={{ borderColor: "var(--zg-border)" }} onSubmit={handleSubmit} noValidate>
        <section className="mb-4" aria-labelledby="system-generated-heading">
          <h2 id="system-generated-heading" className="h5 mb-3">System-generated information</h2>
          <div className="row g-3">
            {[
              ["Ticket Number", "Generated on submit"],
              ["Ticket Date", "Generated on submit"],
              ["Current Status", "Generated on submit"],
            ].map(([label, value]) => (
              <div className="col-md-4" key={label}>
                <div className="rounded-2 p-3 h-100" style={readonlyStyle}>
                  <div className="form-label mb-1" style={{ color: "var(--zg-text-muted)" }}>{label}</div>
                  <div>{value}</div>
                </div>
              </div>
            ))}
            <div className="col-md-4">
              <div className="rounded-2 p-3 h-100" style={readonlyStyle}>
                <div className="form-label mb-1" style={{ color: "var(--zg-text-muted)" }}>Requester</div>
                <div>{selectedRequester?.name || "Unknown"}</div>
              </div>
            </div>
          </div>
        </section>

            
        <section className="mb-4" aria-labelledby="classification-heading">
          <h2 id="classification-heading" className="h5 mb-3">Classification</h2>
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="category" className="form-label">Category<span aria-hidden="true" className="text-danger ms-1">*</span></label>
              <select id="category" className="form-select" value={formValues.category} onChange={(event) => updateField("category", event.target.value)} aria-required="true" aria-invalid={validationErrors.category ? "true" : undefined} aria-describedby={validationErrors.category ? "category-error" : undefined} style={inputStyle("category")} onFocus={(event) => Object.assign(event.currentTarget.style, focusStyle)} onBlur={(event) => { event.currentTarget.style.borderColor = ""; event.currentTarget.style.boxShadow = ""; }}>
                <option value="">Select a category...</option>
                {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
              </select>
              {validationErrors.category && <div id="category-error" className="text-danger small mt-1" role="alert">{validationErrors.category}</div>}
            </div>
            <div className="col-md-4">
              <label htmlFor="related-system" className="form-label">Related System<span aria-hidden="true" className="text-danger ms-1">*</span></label>
              <select id="related-system" className="form-select" value={formValues.relatedSystem} onChange={(event) => updateField("relatedSystem", event.target.value)} aria-required="true" aria-invalid={validationErrors.relatedSystem ? "true" : undefined} aria-describedby={validationErrors.relatedSystem ? "related-system-error" : undefined} style={inputStyle("relatedSystem")} onFocus={(event) => Object.assign(event.currentTarget.style, focusStyle)} onBlur={(event) => { event.currentTarget.style.borderColor = ""; event.currentTarget.style.boxShadow = ""; }}>
                <option value="">Select a related system...</option>
                {relatedSystems.map((system) => <option value={system.id} key={system.id}>{system.name}</option>)}
              </select>
              {validationErrors.relatedSystem && <div id="related-system-error" className="text-danger small mt-1" role="alert">{validationErrors.relatedSystem}</div>}
            </div>
            <div className="col-md-4">
              <label htmlFor="priority" className="form-label">Priority<span aria-hidden="true" className="text-danger ms-1">*</span></label>
              <select id="priority" className="form-select" value={formValues.priority} onChange={(event) => updateField("priority", event.target.value)} aria-required="true" aria-invalid={validationErrors.priority ? "true" : undefined} aria-describedby={validationErrors.priority ? "priority-error" : undefined} style={inputStyle("priority")} onFocus={(event) => Object.assign(event.currentTarget.style, focusStyle)} onBlur={(event) => { event.currentTarget.style.borderColor = ""; event.currentTarget.style.boxShadow = ""; }}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              {validationErrors.priority && <div id="priority-error" className="text-danger small mt-1" role="alert">{validationErrors.priority}</div>}
            </div>
          </div>
        </section>

        <section className="mb-4" aria-labelledby="request-details-heading">
          <h2 id="request-details-heading" className="h5 mb-3">Request details</h2>
          <div className="mb-3">
            <label htmlFor="summary" className="form-label">Summary<span aria-hidden="true" className="text-danger ms-1">*</span></label>
            <input id="summary" type="text" className="form-control" value={formValues.summary} onChange={(event) => updateField("summary", event.target.value)} aria-required="true" aria-invalid={validationErrors.summary ? "true" : undefined} aria-describedby={validationErrors.summary ? "summary-error" : undefined} style={inputStyle("summary")} onFocus={(event) => Object.assign(event.currentTarget.style, focusStyle)} onBlur={(event) => { event.currentTarget.style.borderColor = ""; event.currentTarget.style.boxShadow = ""; }} />
            {validationErrors.summary && <div id="summary-error" className="text-danger small mt-1" role="alert">{validationErrors.summary}</div>}
          </div>
          <div>
            <label htmlFor="description" className="form-label">Description<span aria-hidden="true" className="text-danger ms-1">*</span></label>
            <textarea id="description" className="form-control" rows={6} value={formValues.description} onChange={(event) => updateField("description", event.target.value)} aria-required="true" aria-invalid={validationErrors.description ? "true" : undefined} aria-describedby={validationErrors.description ? "description-error" : undefined} style={inputStyle("description")} onFocus={(event) => Object.assign(event.currentTarget.style, focusStyle)} onBlur={(event) => { event.currentTarget.style.borderColor = ""; event.currentTarget.style.boxShadow = ""; }} />
            {validationErrors.description && <div id="description-error" className="text-danger small mt-1" role="alert">{validationErrors.description}</div>}
          </div>
        </section>

        <section className="mb-4" aria-labelledby="attachments-heading">
          <h2 id="attachments-heading" className="h5 mb-3">Attachments</h2>
          <label htmlFor="attachments" className="form-label">Supporting files</label>
          <input id="attachments" type="file" className="form-control" />
          <div className="form-text" style={{ color: "var(--zg-text-muted)" }}>JPG, PNG, WEBP, or PDF. Up to 5 MB per file, maximum 5 files.</div>
        </section>

        {submitError && <div className="alert mb-3" role="alert" style={{ backgroundColor: "var(--zg-error-bg)", borderColor: "var(--zg-error)", color: "var(--zg-error)" }}>{submitError}</div>}

        <div className="d-flex justify-content-between gap-2 pt-3 border-top" style={{ borderColor: "var(--zg-border)" }}>
          <button type="button" className="btn btn-outline-success" style={{ color: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={isSubmitting} aria-busy={isSubmitting} style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}>
            {isSubmitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {isSubmitting ? "Submitting…" : "Submit Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}