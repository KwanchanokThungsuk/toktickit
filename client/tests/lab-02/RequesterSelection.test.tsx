import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterSelection from "../../src/components/RequesterSelection";
import { RequesterProvider } from "../../src/components/RequesterContext";
import * as api from "../../src/api";

// Wrapper component to provide context
function RequesterSelectionWithContext() {
  return (
    <RequesterProvider>
      <RequesterSelection />
    </RequesterProvider>
  );
}

describe("RequesterSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // UI-01: Successful rendering of active requesters
  it("renders active requesters in a dropdown after loading (UI-01)", async () => {
    const mockRequesters = [
      { id: 1, name: "Alice Smith", email: "alice.smith@example.com" },
      { id: 2, name: "Bob Jones", email: "bob.jones@example.com" },
      { id: 3, name: "Charlie Brown", email: "charlie.brown@example.com" },
    ];

    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<RequesterSelectionWithContext />);

    // Should show loading state initially
    expect(screen.getByText(/Loading active requesters/i)).toBeInTheDocument();

    // Wait for requesters to load
    await waitFor(() => {
      expect(screen.getByText(/Select Your Account/i)).toBeInTheDocument();
    });

    // All requesters should be displayed
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
    expect(screen.getByText(/Charlie Brown/i)).toBeInTheDocument();

    // Emails should also be visible
    expect(screen.getByText(/alice.smith@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/bob.jones@example.com/i)).toBeInTheDocument();
  });

  // UI-04: Error state when API fails
  it("displays error state with retry button when API fails (UI-04)", async () => {
    const errorMessage = "Failed to connect to the server";
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error(errorMessage));

    render(<RequesterSelectionWithContext />);

    // Should show loading state initially
    expect(screen.getByText(/Loading active requesters/i)).toBeInTheDocument();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
    });

    // Error message should be displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Retry button should be present
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  // UI-05: Empty state when no active requesters
  it("displays empty state when no active requesters are available (UI-05)", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);

    render(<RequesterSelectionWithContext />);

    // Should show loading state initially
    expect(screen.getByText(/Loading active requesters/i)).toBeInTheDocument();

    // Wait for empty state - check for the title element
    await waitFor(() => {
      const title = screen.getByRole("heading", { name: /No Active Requesters/i });
      expect(title).toBeInTheDocument();
    });

    // Empty message should be displayed
    expect(screen.getByText(/no active requesters available/i)).toBeInTheDocument();

    // No dropdown should be visible
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  // Loading state
  it("shows loading state while fetching requesters", () => {
    vi.spyOn(api, "fetchRequesters").mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RequesterSelectionWithContext />);

    expect(screen.getByText(/Loading active requesters/i)).toBeInTheDocument();
  });

  // Selection and continuation
  it("allows user to select a requester and continue", async () => {
    const mockRequesters = [
      { id: 1, name: "Alice Smith", email: "alice.smith@example.com" },
      { id: 2, name: "Bob Jones", email: "bob.jones@example.com" },
    ];

    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<RequesterSelectionWithContext />);

    // Wait for the dropdown to be loaded
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select a requester from dropdown
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    // Continue button should be enabled
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).not.toBeDisabled();

    // Click continue
    fireEvent.click(continueButton);

    // Requester should be stored in localStorage
    const stored = localStorage.getItem("toktickit-selected-requester");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe(1);
    expect(parsed.name).toBe("Alice Smith");
  });

  // Continue button should be disabled until a requester is selected
  it("disables the Continue button until a requester is selected", async () => {
    const mockRequesters = [
      { id: 1, name: "Alice Smith", email: "alice.smith@example.com" },
    ];

    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<RequesterSelectionWithContext />);

    // Wait for the dropdown to be loaded
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Continue button should be disabled initially
    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
  });
});
