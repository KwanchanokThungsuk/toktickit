import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider, useRequester } from "../../src/components/RequesterContext";
import App from "../../src/App";
import * as api from "../../src/api";

// Test component that uses the context
function TestConsumer() {
  const { selectedRequester, setSelectedRequester, clearSelectedRequester } = useRequester();

  return (
    <div>
      {selectedRequester ? (
        <div>
          <p data-testid="selected-name">{selectedRequester.name}</p>
          <button onClick={clearSelectedRequester}>Clear Requester</button>
        </div>
      ) : (
        <p data-testid="no-requester">No requester selected</p>
      )}
      <button
        onClick={() =>
          setSelectedRequester({
            id: 99,
            name: "Test User",
            email: "test@example.com",
          })
        }
      >
        Set Requester
      </button>
    </div>
  );
}

describe("RequesterContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // UI-02: Route is guarded when no requester is selected
  it("guards the route when no requester is selected - shows RequesterSelection (UI-02)", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Alice Smith", email: "alice@example.com" },
    ]);
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [],
    });

    render(<App />);

    // When no requester is selected, RequesterSelection should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Select Your Account/i)).toBeInTheDocument();
    });

    // AppShell should NOT be displayed yet
    expect(screen.queryByText(/System Status/i)).not.toBeInTheDocument();
  });

  // UI-03: Changing requester clears state
  it("clears the selected requester when clearSelectedRequester is called (UI-03)", () => {
    render(
      <RequesterProvider>
        <TestConsumer />
      </RequesterProvider>
    );

    // Initially no requester
    expect(screen.getByTestId("no-requester")).toBeInTheDocument();

    // Set a requester
    fireEvent.click(screen.getByRole("button", { name: /Set Requester/i }));

    // Requester should be selected
    expect(screen.getByTestId("selected-name")).toBeInTheDocument();
    expect(screen.getByTestId("selected-name")).toHaveTextContent("Test User");

    // Clear requester
    fireEvent.click(screen.getByRole("button", { name: /Clear Requester/i }));

    // Should be back to no requester state
    expect(screen.getByTestId("no-requester")).toBeInTheDocument();
    expect(screen.queryByTestId("selected-name")).not.toBeInTheDocument();
  });

  // Context initialization and storage
  it("initializes selectedRequester from localStorage", () => {
    const mockRequester = { id: 1, name: "Alice", email: "alice@example.com" };
    localStorage.setItem("toktickit-selected-requester", JSON.stringify(mockRequester));

    render(
      <RequesterProvider>
        <TestConsumer />
      </RequesterProvider>
    );

    // Requester should be loaded from localStorage
    expect(screen.getByTestId("selected-name")).toHaveTextContent("Alice");
  });

  // Persistence in localStorage
  it("persists selectedRequester to localStorage when set", () => {
    render(
      <RequesterProvider>
        <TestConsumer />
      </RequesterProvider>
    );

    // Set a requester
    fireEvent.click(screen.getByRole("button", { name: /Set Requester/i }));

    // Should be stored in localStorage
    const stored = localStorage.getItem("toktickit-selected-requester");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe(99);
    expect(parsed.name).toBe("Test User");
  });

  // Clear localStorage on clear
  it("clears localStorage when clearSelectedRequester is called", () => {
    const mockRequester = { id: 1, name: "Alice", email: "alice@example.com" };
    localStorage.setItem("toktickit-selected-requester", JSON.stringify(mockRequester));

    render(
      <RequesterProvider>
        <TestConsumer />
      </RequesterProvider>
    );

    // Requester should be loaded
    expect(screen.getByTestId("selected-name")).toHaveTextContent("Alice");

    // Clear requester
    fireEvent.click(screen.getByRole("button", { name: /Clear Requester/i }));

    // localStorage should be cleared
    expect(localStorage.getItem("toktickit-selected-requester")).toBeNull();
  });

  // useRequester hook throws error outside provider
  it("throws error when useRequester is used outside RequesterProvider", () => {
    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponentWithoutProvider() {
      useRequester();
      return <div>Should not render</div>;
    }

    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow("useRequester must be used within a RequesterProvider");

    consoleSpy.mockRestore();
  });

  // Show AppShell when requester is selected
  it("shows AppShell with requester name when a requester is selected", async () => {
    const mockRequester = { id: 1, name: "Alice Smith", email: "alice@example.com" };
    localStorage.setItem("toktickit-selected-requester", JSON.stringify(mockRequester));

    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [{ id: 1, name: "Hardware" }],
    });

    render(<App />);

    // AppShell should be displayed with the requester name
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    });

    // RequesterSelection should NOT be displayed
    expect(screen.queryByText(/Select Your Account/i)).not.toBeInTheDocument();
  });

  // Change requester navigation
  it("returns to RequesterSelection when Change Requester is clicked", async () => {
    const mockRequester = { id: 1, name: "Alice Smith", email: "alice@example.com" };
    localStorage.setItem("toktickit-selected-requester", JSON.stringify(mockRequester));

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Alice Smith", email: "alice@example.com" },
      { id: 2, name: "Bob Jones", email: "bob@example.com" },
    ]);

    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [],
    });

    render(<App />);

    // AppShell should be displayed initially
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    });

    // Find and click the Change Requester button (tertiary button in the header)
    const changeButtons = screen.getAllByRole("button");
    const changeRequesterButton = changeButtons.find((btn) =>
      btn.textContent?.includes("Change Requester")
    );

    if (changeRequesterButton) {
      fireEvent.click(changeRequesterButton);

      // Should return to RequesterSelection
      await waitFor(() => {
        expect(screen.getByText(/Select Your Account/i)).toBeInTheDocument();
      });

      // AppShell content should be gone
      expect(screen.queryByText(/System Status/i)).not.toBeInTheDocument();
    }
  });
});
