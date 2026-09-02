import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppShell from "../../src/components/AppShell";
import FormInput from "../../src/components/FormInput";
import FormSelect from "../../src/components/FormSelect";
import Loading from "../../src/components/Loading";
import Empty from "../../src/components/Empty";
import ErrorState from "../../src/components/ErrorState";

describe("AppShell", () => {
  it("renders the title, navigation, and requester details", () => {
    render(
      <AppShell
        title="TokTickIT"
        requesterName="Alex Morgan"
        navItems={[
          { label: "My Tickets", href: "/tickets", current: true },
          { label: "Create Ticket", href: "/tickets/new" },
        ]}
      />,
    );

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Tickets" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
  });
});

describe("Form fields", () => {
  it("renders a labeled input with required and error state details", () => {
    render(
      <FormInput
        id="summary"
        label="Summary"
        required
        helperText="Add a short summary"
        error="Summary must be between 10 and 150 characters."
      />,
    );

    const input = screen.getByLabelText(/Summary/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-describedby", "summary-hint summary-error");
    expect(screen.getByText("Summary must be between 10 and 150 characters.")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders a labeled select with the correct aria attributes", () => {
    render(
      <FormSelect
        id="category"
        label="Category"
        required
        error="Please choose a category."
        options={[
          { value: "", label: "Select a category" },
          { value: "hardware", label: "Hardware" },
        ]}
      />,
    );

    const select = screen.getByLabelText(/Category/i);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose a category.");
  });
});

describe("State components", () => {
  it("renders the default loading message", () => {
    render(<Loading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders custom empty state content", () => {
    render(
      <Empty
        title="No tickets yet"
        message="Create your first support request."
        action={<button type="button">Create Ticket</button>}
      />,
    );

    expect(screen.getByText("No tickets yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first support request.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
  });

  it("renders the default error state and custom action", () => {
    render(
      <ErrorState
        title="Request failed"
        message="The system could not load your tickets."
        action={<button type="button">Retry</button>}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
    expect(screen.getByText("The system could not load your tickets.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
