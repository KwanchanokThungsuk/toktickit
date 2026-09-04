import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MyTickets from "../../src/components/MyTickets";
import { useRequester } from "../../src/components/RequesterContext";
import {
  fetchCategories,
  fetchRelatedSystems,
  fetchTickets,
} from "../../src/api";

import type {
  Category,
  RelatedSystem,
  TicketListItem,
  TicketListResponse,
} from "../../src/api";

vi.mock("../../src/api", () => ({
  fetchCategories: vi.fn(),
  fetchRelatedSystems: vi.fn(),
  fetchTickets: vi.fn(),
}));

vi.mock("../../src/components/RequesterContext", () => ({
  useRequester: vi.fn(),
}));

const mockedUseRequester = vi.mocked(useRequester);
const mockedFetchCategories = vi.mocked(fetchCategories);
const mockedFetchRelatedSystems = vi.mocked(fetchRelatedSystems);
const mockedFetchTickets = vi.mocked(fetchTickets);

const requesterA = {
  id: 1,
  name: "Alice Smith",
  email: "alice@example.com",
};

const requesterB = {
  id: 2,
  name: "Bob Jones",
  email: "bob@example.com",
};

const categories: Category[] = [
  {
    id: 1,
    name: "Hardware",
  },
  {
    id: 2,
    name: "Software",
  },
];

const relatedSystems: RelatedSystem[] = [
  {
    id: 1,
    name: "Email System",
  },
  {
    id: 2,
    name: "Network System",
  },
];

function createTicket(
  overrides: Partial<TicketListItem> = {},
): TicketListItem {
  return {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    summary: "Laptop cannot connect to Wi-Fi",
    category: {
      id: 1,
      name: "Hardware",
    },
    relatedSystem: {
      id: 2,
      name: "Network System",
    },
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T11:00:00.000Z",
    ...overrides,
  };
}

function createResponse(
  tickets: TicketListItem[] = [createTicket()],
  meta: Partial<TicketListResponse["meta"]> = {},
): TicketListResponse {
  return {
    data: tickets,
    meta: {
      page: 1,
      pageSize: 10,
      totalItems: tickets.length,
      totalPages: tickets.length > 0 ? 1 : 0,
      ...meta,
    },
  };
}

function setupRequester(requester = requesterA) {
  mockedUseRequester.mockReturnValue({
    selectedRequester: requester,
    setSelectedRequester: vi.fn(),
    clearSelectedRequester: vi.fn(),
  });
}

function renderMyTickets(requester = requesterA) {
  setupRequester(requester);
  return render(<MyTickets />);
}

beforeEach(() => {
  vi.clearAllMocks();

  mockedFetchCategories.mockResolvedValue(categories);
  mockedFetchRelatedSystems.mockResolvedValue(relatedSystems);

  mockedFetchTickets.mockResolvedValue(createResponse());

  setupRequester();
});

describe("MyTickets", () => {
  describe("UI-13 / AC-22 - ticket list and pagination", () => {
    it("renders the My Tickets heading and subtitle", async () => {
      renderMyTickets();

      expect(
        screen.getByRole("heading", {
          name: "My Tickets",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          "View and track all of your support requests.",
        ),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(mockedFetchTickets).toHaveBeenCalled();
      });
    });

    it("renders the owned ticket returned by the API", async () => {
        const ticket = createTicket();

        mockedFetchTickets.mockResolvedValue(
            createResponse([ticket])
        );

        renderMyTickets();

        const table = await screen.findByRole("table");

        expect(
            within(table).getByRole("link", { name: ticket.ticketNumber }),
        ).toBeInTheDocument();

        expect(
            within(table).getByText(ticket.summary),
        ).toBeInTheDocument();

        expect(
            within(table).getByText("Hardware"),
        ).toBeInTheDocument();

        expect(
            within(table).getByText("Network System"),
        ).toBeInTheDocument();

        expect(
            within(table).getByText("HIGH"),
        ).toBeInTheDocument();

        expect(
            within(table).getByText("NEW"),
        ).toBeInTheDocument();
    });

    it("renders pagination metadata from the API response", async () => {
        mockedFetchTickets.mockReset();

        mockedFetchTickets.mockResolvedValue(
            createResponse(
            [createTicket()],
            {
                page: 1,
                pageSize: 10,
                totalItems: 25,
                totalPages: 3,
            },
            ),
        );

        renderMyTickets();

        await waitFor(() => {
            expect(
            screen.getByText("Showing 1 to 10 of 25 tickets"),
            ).toBeInTheDocument();
        });

      expect(
        screen.getByRole("button", {
          name: "1",
        }),
      ).toHaveAttribute("aria-current", "page");

      expect(
        screen.getByRole("button", {
          name: /previous/i,
        }),
      ).toBeDisabled();

      expect(
        screen.getByRole("button", {
          name: /next/i,
        }),
      ).toBeEnabled();
    });
  });

  describe("UI-14 / AC-23 - requester switching", () => {
    it("removes Requester A tickets after switching to Requester B", async () => {
      const ticketA = createTicket({
        id: 1,
        ticketNumber: "TKT-2026-000001",
        summary: "Requester A ticket",
      });

      const ticketB = createTicket({
        id: 2,
        ticketNumber: "TKT-2026-000002",
        summary: "Requester B ticket",
      });

      mockedFetchTickets.mockImplementation(async ({ requesterId }) => {
        if (requesterId === requesterA.id) {
            return createResponse([ticketA]);
        }

        if (requesterId === requesterB.id) {
            return createResponse([ticketB]);
        }

        return createResponse([]);
        });

      const { rerender } = renderMyTickets(requesterA);

      const table = await screen.findByRole("table");
      await waitFor(() => {
        expect(
          within(table).getByText("Requester A ticket"),
        ).toBeInTheDocument();
      });

      mockedUseRequester.mockReturnValue({
        selectedRequester: requesterB,
        setSelectedRequester: vi.fn(),
        clearSelectedRequester: vi.fn(),
      });

      rerender(<MyTickets />);

      const updatedTable = await screen.findByRole("table");

        expect(
        within(updatedTable).getByText("Requester B ticket"),
        ).toBeInTheDocument();

        expect(
        within(updatedTable).queryByText("Requester A ticket"),
        ).not.toBeInTheDocument();

      expect(
        mockedFetchTickets,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          requesterId: requesterB.id,
        }),
      );
    });
  });

  describe("UI-15 / AC-24 - search", () => {
    it("resets pagination to page 1 when searching", async () => {
      const user = userEvent.setup();

      mockedFetchTickets
        .mockResolvedValueOnce(
          createResponse(
            [createTicket()],
            {
              page: 3,
              pageSize: 10,
              totalItems: 30,
              totalPages: 3,
            },
          ),
        )
        .mockResolvedValue(
          createResponse(
            [
              createTicket({
                summary: "VPN connection problem",
              }),
            ],
            {
              page: 1,
              pageSize: 10,
              totalItems: 1,
              totalPages: 1,
            },
          ),
        );

      renderMyTickets();

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenCalled();
      });

      const searchInput =
        screen.getByPlaceholderText(
          "Search by ticket number or summary…",
        );

      await user.type(searchInput, "VPN");

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            requesterId: requesterA.id,
            search: "VPN",
            page: 1,
          }),
        );
      });
    });
  });

  describe("UI-16 / AC-25 - no-results state", () => {
    it("shows the no-results message and Clear Filters action", async () => {
        const user = userEvent.setup();

        mockedFetchTickets.mockResolvedValue(
            createResponse([], {
            totalItems: 0,
            totalPages: 0,
            }),
        );

        renderMyTickets();

        const searchInput = screen.getByPlaceholderText(
            "Search by ticket number or summary…",
        );

        await user.type(searchInput, "VPN");

        await waitFor(() => {
            expect(
            screen.getByText("No tickets match your search or filters."),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByRole("button", {
            name: /clear filters/i,
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByText("You have not created any tickets yet."),
        ).not.toBeInTheDocument();
        });

    it("clears search and filters from the no-results state", async () => {
        const user = userEvent.setup();

        mockedFetchTickets.mockResolvedValue(
            createResponse([], {
            totalItems: 0,
            totalPages: 0,
            }),
        );

        renderMyTickets();

        const searchInput = screen.getByPlaceholderText(
            "Search by ticket number or summary…",
        );

        await user.type(searchInput, "VPN");

        await waitFor(() => {
            expect(
            screen.getByText("No tickets match your search or filters."),
            ).toBeInTheDocument();
        });

        await user.click(
            screen.getByRole("button", {
            name: /clear filters/i,
            }),
        );

        await waitFor(() => {
            expect(
            mockedFetchTickets,
            ).toHaveBeenLastCalledWith(
            expect.objectContaining({
                search: "",
                categoryId: "",
                relatedSystemId: "",
                requestedPriority: undefined,
                currentStatus: undefined,
                page: 1,
            }),
            );
        });
        });
  });

  describe("UI-17 / AC-26 - empty state", () => {
    it("shows the empty state for a requester with no tickets", async () => {
      mockedFetchTickets.mockResolvedValue(
        createResponse([], {
          totalItems: 0,
          totalPages: 0,
        }),
      );

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByText(
            "You have not created any tickets yet.",
          ),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("link", {
          name: /create ticket/i,
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole("button", {
          name: /clear filters/i,
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByText(
          "No tickets match your search or filters.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("UI-18 / AC-28 - sorting", () => {
    it("sorts by Ticket Number and updates aria-sort", async () => {
      const user = userEvent.setup();

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });

      const ticketHeader =
        screen.getByRole("columnheader", {
          name: /ticket no/i,
        });

      expect(ticketHeader).toHaveAttribute(
        "aria-sort",
        "none",
      );

      await user.click(
        within(ticketHeader).getByRole("button"),
      );

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: "ticketNumber",
            sortOrder: "asc",
            page: 1,
          }),
        );
      });

      expect(ticketHeader).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
    });

    it("toggles the sort order when the same header is clicked again", async () => {
      const user = userEvent.setup();

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });

      const ticketHeader =
        screen.getByRole("columnheader", {
          name: /ticket no/i,
        });

      const sortButton =
        within(ticketHeader).getByRole("button");

      await user.click(sortButton);

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: "ticketNumber",
            sortOrder: "asc",
          }),
        );
      });

      await user.click(sortButton);

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: "ticketNumber",
            sortOrder: "desc",
          }),
        );
      });

      expect(ticketHeader).toHaveAttribute(
        "aria-sort",
        "descending",
      );
    });

    it("resets pagination to page 1 when sorting changes", async () => {
      const user = userEvent.setup();

      mockedFetchTickets.mockResolvedValue(
        createResponse(
          [createTicket()],
          {
            page: 1,
            pageSize: 10,
            totalItems: 25,
            totalPages: 3,
          },
        ),
      );

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });

      const createdDateHeader =
        screen.getByRole("columnheader", {
          name: /created date/i,
        });

      await user.click(
        within(createdDateHeader).getByRole("button"),
      );

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: "createdAt",
            sortOrder: "asc",
            page: 1,
          }),
        );
      });
    });
  });

  describe("UI-23 / AC-35 - Current Status filter", () => {
    it("provides only All Statuses and New options", () => {
      renderMyTickets();

      const statusSelect =
        screen.getByRole("combobox", {
          name: /current status/i,
        });

      expect(
        within(statusSelect).getByRole("option", {
          name: "All Statuses",
        }),
      ).toBeInTheDocument();

      expect(
        within(statusSelect).getByRole("option", {
          name: "New",
        }),
      ).toBeInTheDocument();

      expect(
        within(statusSelect).queryByRole("option", {
          name: /closed/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("requests NEW tickets and resets page to 1", async () => {
      const user = userEvent.setup();

      renderMyTickets();

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenCalled();
      });

      const statusSelect =
        screen.getByRole("combobox", {
          name: /current status/i,
        });

      await user.selectOptions(
        statusSelect,
        "NEW",
      );

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            currentStatus: "NEW",
            page: 1,
          }),
        );
      });
    });

    it("clears the Current Status filter", async () => {
      const user = userEvent.setup();

      renderMyTickets();

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenCalled();
      });

      const statusSelect =
        screen.getByRole("combobox", {
          name: /current status/i,
        });

      await user.selectOptions(
        statusSelect,
        "NEW",
      );

      const clearButton =
        screen.getByRole("button", {
          name: /clear filters/i,
        });

      await user.click(clearButton);

      expect(statusSelect).toHaveValue("");

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            currentStatus: undefined,
            page: 1,
          }),
        );
      });
    });
  });

  describe("filter controls", () => {
    it("renders all required filter controls", () => {
      renderMyTickets();

      expect(
        screen.getByPlaceholderText(
          "Search by ticket number or summary…",
        ),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("combobox", {
          name: "Category",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("combobox", {
          name: "Related System",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("combobox", {
          name: "Requested Priority",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("combobox", {
          name: "Current Status",
        }),
      ).toBeInTheDocument();
    });

    it("renders All options for every filter", () => {
      renderMyTickets();

      expect(
        screen.getByRole("option", {
          name: "All Categories",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "All Related Systems",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "All Priorities",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "All Statuses",
        }),
      ).toBeInTheDocument();
    });

    it("loads category and related-system options from the API", async () => {
      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByRole("option", {
            name: "Hardware",
          }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("option", {
          name: "Software",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "Email System",
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole("option", {
          name: "Network System",
        }),
      ).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows a loading indicator while tickets are being fetched", async () => {
      let resolveTickets:
        | ((value: TicketListResponse) => void)
        | undefined;

      mockedFetchTickets.mockReturnValue(
        new Promise<TicketListResponse>((resolve) => {
          resolveTickets = resolve;
        }),
      );

      renderMyTickets();

      expect(
        screen.getByRole("status", {
          name: "Loading your tickets",
        }),
      ).toBeInTheDocument();

      resolveTickets?.(createResponse());

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("shows an error message and Retry action when the API fails", async () => {
      mockedFetchTickets.mockRejectedValue(
        new Error("Backend unavailable"),
      );

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: /retry/i,
          }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "Backend unavailable",
        ),
      ).toBeInTheDocument();
    });

    it("retries the ticket request when Retry is clicked", async () => {
      const user = userEvent.setup();

      mockedFetchTickets
        .mockRejectedValueOnce(
          new Error("Backend unavailable"),
        )
        .mockResolvedValueOnce(
          createResponse([createTicket()]),
        );

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: /retry/i,
          }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", {
          name: /retry/i,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });

      expect(
        mockedFetchTickets,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("pagination", () => {
    it("loads the next page when Next is clicked", async () => {
      const user = userEvent.setup();

      mockedFetchTickets
        .mockResolvedValueOnce(
          createResponse(
            [
              createTicket({
                id: 1,
                ticketNumber: "TKT-2026-000001",
              }),
            ],
            {
              page: 1,
              pageSize: 10,
              totalItems: 20,
              totalPages: 2,
            },
          ),
        )
        .mockResolvedValueOnce(
          createResponse(
            [
              createTicket({
                id: 11,
                ticketNumber: "TKT-2026-000011",
              }),
            ],
            {
              page: 2,
              pageSize: 10,
              totalItems: 20,
              totalPages: 2,
            },
          ),
        );

      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000001",
          ),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", {
          name: /next/i,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "TKT-2026-000011",
          ),
        ).toBeInTheDocument();
      });

      expect(
        mockedFetchTickets,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        }),
      );

      expect(
        screen.getByRole("button", {
          name: "2",
        }),
      ).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("provides page size options 10, 20, and 50", async () => {
        renderMyTickets();

        const pageSizeSelect = await screen.findByRole("combobox", {
            name: "Page size",
        });

        expect(pageSizeSelect).toHaveValue("10");

        expect(
            within(pageSizeSelect).getByRole("option", { name: "10" }),
        ).toBeInTheDocument();

        expect(
            within(pageSizeSelect).getByRole("option", { name: "20" }),
        ).toBeInTheDocument();

        expect(
            within(pageSizeSelect).getByRole("option", { name: "50" }),
        ).toBeInTheDocument();
        });

    it("resets page to 1 when page size changes", async () => {
      const user = userEvent.setup();

      renderMyTickets();

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenCalled();
      });

      const pageSizeSelect =
        screen.getByRole("combobox", {
          name: "Page size",
        });

      await user.selectOptions(
        pageSizeSelect,
        "20",
      );

      await waitFor(() => {
        expect(
          mockedFetchTickets,
        ).toHaveBeenLastCalledWith(
          expect.objectContaining({
            page: 1,
            pageSize: 20,
          }),
        );
      });
    });
  });

  describe("ticket detail navigation", () => {
    it("renders Ticket Number as a link to the ticket detail route", async () => {
        const ticket = createTicket({
            id: 123,
            ticketNumber: "TKT-2026-000123",
        });

        mockedFetchTickets.mockResolvedValue(
            createResponse([ticket]),
        );

        renderMyTickets();

        const table = await screen.findByRole("table");

        const ticketLink = within(table).getByRole("link", {
            name: ticket.ticketNumber,
        });

        expect(ticketLink).toHaveAttribute(
            "href",
            "#/tickets/123",
        );
        });
  });

  describe("Create Ticket action", () => {
    it("renders a Create Ticket action", async () => {
      renderMyTickets();

      await waitFor(() => {
        expect(
          screen.getByRole("link", {
            name: /create ticket/i,
          }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("link", {
          name: /create ticket/i,
        }),
      ).toHaveAttribute(
        "href",
        "#/tickets/new",
      );
    });
  });
});