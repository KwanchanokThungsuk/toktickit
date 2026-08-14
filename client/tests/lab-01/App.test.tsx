import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
      ],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Account and Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
    });
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Network Error"));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Check System/i }));

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    });
  });
});
