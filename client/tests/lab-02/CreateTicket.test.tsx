import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CreateTicket from "../../src/components/CreateTicket";
import { RequesterProvider } from "../../src/components/RequesterContext";
import { uploadAttachment } from "../../src/api";

// Mock API functions
vi.mock("../../src/api", () => ({
  fetchCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Hardware" }]),
  fetchRelatedSystems: vi.fn().mockResolvedValue([{ id: 1, name: "Email System" }]),
  createTicket: vi.fn().mockResolvedValue({ ticketNumber: "TICK-999" }),
  uploadAttachment: vi.fn(),
}));

const mockRequester = { id: 1, name: "Charlie Brown", email: "charlie@example.com" };

// Helper to wrap component with required context
function renderWithContext(ui: React.ReactNode) {
  vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(mockRequester));
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("CreateTicket Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadAttachment).mockResolvedValue({ id: 1, ticketId: 101, originalFilename: "screenshot.png", contentType: "image/png", fileSize: 1, uploadedAt: "2026-01-01T00:00:00.000Z", isRemoved: false, removedAt: null, removedById: null, removedReason: null });
  });

  it("renders loading state initially and then loads reference data", async () => {
    renderWithContext(<CreateTicket />);
    
    expect(screen.getByText(/loading ticket options/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create ticket/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty required fields", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/please select a category/i)).toBeInTheDocument();
    expect(screen.getByText(/summary must be between 10 and 150 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be between 20 and 5000 characters/i)).toBeInTheDocument();
  });

  it("validates summary and description character limits", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Short" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Too short desc" } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/summary must be between 10 and 150 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be between 20 and 5000 characters/i)).toBeInTheDocument();
  });

  it("validates attachment file type and size constraints", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/supporting files/i);

    // Test invalid file type
    const invalidFile = new File(["dummy content"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByText(/invalid file type/i)).toBeInTheDocument();

    // Test oversized file (> 5MB)
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "large.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(await screen.findByText(/exceeds the 5 mb size limit/i)).toBeInTheDocument();

    // Test valid file selection and rendering in list
    const validFile = new File(["valid image content"], "screenshot.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("screenshot.png (0.00 MB)")).toBeInTheDocument();
    });
  });

  it("submits successfully and shows success screen with ticket number", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/categories")) {
        return new Response(JSON.stringify([{ id: 1, name: "Hardware" }]), { status: 200 });
      }
      if (urlString.includes("/api/related-systems")) {
        return new Response(JSON.stringify([{ id: 1, name: "Email System" }]), { status: 200 });
      }
      if (urlString.includes("/api/tickets")) {
        return new Response(JSON.stringify({ ticketNumber: "TKT-2026-0099", id: 101 }), { status: 201 });
      }

      if (urlString.includes("/attachments")) {
        return new Response(JSON.stringify({ id: 1, originalFilename: "screenshot.png" }), { status: 201 });
      }
      
      return new Response(JSON.stringify({}), { status: 404 });
    });

    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Network connection is down in lab" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Please help check the router configuration on the 3rd floor." } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/TKT-/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /view ticket/i })).toBeInTheDocument();
    });
  });

  it("preserves form data and shows error message when API submission fails", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/categories")) {
        return new Response(JSON.stringify([{ id: 1, name: "Hardware" }]), { status: 200 });
      }
      if (urlString.includes("/api/related-systems")) {
        return new Response(JSON.stringify([{ id: 1, name: "Email System" }]), { status: 200 });
      }
      if (urlString.includes("/api/tickets")) {
        return new Response(JSON.stringify({ error: { message: "Unable to create ticket. Please try again." } }), { status: 500 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    const summaryInput = screen.getByLabelText(/summary/i);
    fireEvent.change(summaryInput, { target: { value: "Important system bug found" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Detailed description of the critical bug happening right now." } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to create ticket/i)).toBeInTheDocument();
    });
    expect(summaryInput).toHaveValue("Important system bug found");
  });

  it("keeps the created ticket and retries an attachment that fails to upload", async () => {
    vi.spyOn(window, "fetch").mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/categories")) return new Response(JSON.stringify([{ id: 1, name: "Hardware" }]), { status: 200 });
      if (urlString.includes("/api/related-systems")) return new Response(JSON.stringify([{ id: 1, name: "Email System" }]), { status: 200 });
      if (urlString.endsWith("/api/tickets")) return new Response(JSON.stringify({ ticketNumber: "TKT-2026-0099", id: 101 }), { status: 201 });
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.mocked(uploadAttachment).mockRejectedValueOnce(new Error("File exceeds 5 MB limit"));

    renderWithContext(<CreateTicket />);
    await screen.findByRole("button", { name: /submit ticket/i });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Network connection is down in lab" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Please help check the router configuration on the 3rd floor." } });
    const file = new File(["image"], "screenshot.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/supporting files/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText("TKT-2026-0099")).toBeInTheDocument();
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("File exceeds 5 MB limit");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(uploadAttachment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument());
  });
});
