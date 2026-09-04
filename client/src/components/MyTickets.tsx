import { useEffect, useState } from "react";
import {
  Category,
  fetchCategories,
  fetchRelatedSystems,
  fetchTickets,
  RelatedSystem,
  TicketListItem,
  TicketPriority,
  TicketSortBy,
  TicketSortOrder,
  TicketStatus,
} from "../api";
import { useRequester } from "./RequesterContext";
import Badge from "./Badge";
import Empty from "./Empty";
import ErrorState from "./ErrorState";
import FormInput from "./FormInput";
import FormSelect from "./FormSelect";

interface Filters {
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: "" | TicketPriority;
  currentStatus: "" | TicketStatus;
}

const initialFilters: Filters = {
  categoryId: "",
  relatedSystemId: "",
  requestedPriority: "",
  currentStatus: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function priorityVariant(priority: TicketPriority) {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "neutral";
}

function SortHeader({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
  className = "",
}: {
  column: TicketSortBy;
  label: string;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  onSort: (column: TicketSortBy) => void;
  className?: string;
}) {
  const isActive = sortBy === column;
  return (
    <th
      scope="col"
      className={className}
      aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className="my-tickets__sort" onClick={() => onSort(column)}>
        {label}
        {isActive ? <span className="my-tickets__sort-indicator" data-direction={sortOrder} aria-hidden="true" /> : null}
      </button>
    </th>
  );
}

function TicketListSkeleton() {
  return (
    <div className="my-tickets__skeleton" role="status" aria-label="Loading your tickets">
      <span className="visually-hidden">Loading your tickets...</span>
      <div className="my-tickets__skeleton-table" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <div className="my-tickets__skeleton-row" key={index} />)}
      </div>
      <div className="my-tickets__skeleton-cards" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => <div className="my-tickets__skeleton-card" key={index} />)}
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia?.("(max-width: 767px)").matches ?? window.innerWidth < 768);

  useEffect(() => {
    if (!window.matchMedia) {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export default function MyTickets() {
  const { selectedRequester } = useRequester();
  const isMobile = useIsMobile();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<TicketSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<TicketSortOrder>("desc");
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCategories(), fetchRelatedSystems()])
      .then(([categoryData, systemData]) => {
        if (!active) return;
        setCategories(categoryData);
        setRelatedSystems(systemData);
      })
      .catch((reason: unknown) => {
        if (active) setReferenceError(reason instanceof Error ? reason.message : "Unable to load filter options");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedRequester) return;
    let active = true;
    setIsLoading(true);
    setError("");
    fetchTickets({
      requesterId: selectedRequester.id,
      search,
      categoryId: filters.categoryId,
      relatedSystemId: filters.relatedSystemId,
      requestedPriority: filters.requestedPriority || undefined,
      currentStatus: filters.currentStatus || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    })
      .then((response) => {
        if (!active) return;
        setTickets(response.data);
        setMeta(response.meta);
        setHasLoaded(true);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load your tickets");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [selectedRequester, search, filters, sortBy, sortOrder, page, pageSize, retryCount]);

  function updateFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setFilters(initialFilters);
    setPage(1);
  }

  function changeSort(nextSortBy: TicketSortBy) {
    if (sortBy === nextSortBy) setSortOrder((current) => current === "asc" ? "desc" : "asc");
    else { setSortBy(nextSortBy); setSortOrder("asc"); }
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || Object.values(filters).some(Boolean));
  const firstShown = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastShown = Math.min(meta.page * meta.pageSize, meta.totalItems);
  const createTicketAction = <a className="btn zg-button zg-button--primary" href="#/tickets/new">Create Ticket</a>;

  return (
    <div className="my-tickets">
      <header className="my-tickets__header">
        <div><h1>My Tickets</h1><p>View and track all of your support requests.</p></div>
        <div className="my-tickets__actions">
          {meta.totalItems > 0 && hasActiveFilters ? <button type="button" className="btn zg-button zg-button--secondary" onClick={clearFilters}>Clear Filters</button> : null}
          {meta.totalItems > 0 ? createTicketAction : null}
        </div>
      </header>

      {referenceError ? <ErrorState title="Unable to load filter options" message={referenceError} action={<button type="button" className="btn zg-button zg-button--secondary" onClick={() => window.location.reload()}>Retry</button>} /> : null}
      <section className="my-tickets__filters" aria-label="Ticket search and filters">
        <div className="my-tickets__search-control"><span className="my-tickets__search-icon" aria-hidden="true" /><FormInput id="ticket-search" label="Search" placeholder="Search by ticket number or summary…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
        <FormSelect id="ticket-category" label="Category" value={filters.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)} options={[{ value: "", label: "All Categories" }, ...categories.map((item) => ({ value: String(item.id), label: item.name }))]} />
        <FormSelect id="ticket-system" label="Related System" value={filters.relatedSystemId} onChange={(event) => updateFilter("relatedSystemId", event.target.value)} options={[{ value: "", label: "All Related Systems" }, ...relatedSystems.map((item) => ({ value: String(item.id), label: item.name }))]} />
        <FormSelect id="ticket-priority" label="Requested Priority" value={filters.requestedPriority} onChange={(event) => updateFilter("requestedPriority", event.target.value)} options={[{ value: "", label: "All Priorities" }, { value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" }, { value: "HIGH", label: "High" }]} />
        <FormSelect id="ticket-status" label="Current Status" value={filters.currentStatus} onChange={(event) => updateFilter("currentStatus", event.target.value)} options={[{ value: "", label: "All Statuses" }, { value: "NEW", label: "New" }]} />
      </section>

      {isLoading && !hasLoaded ? <TicketListSkeleton /> : error ? <ErrorState title="Unable to load your tickets" message={error} action={<button type="button" className="btn zg-button zg-button--secondary" onClick={() => setRetryCount((count) => count + 1)}>Retry</button>} /> : meta.totalItems === 0 && !hasActiveFilters ? <Empty title="You have not created any tickets yet." message="Create your first support request to get help from the IT team." action={createTicketAction} /> : meta.totalItems === 0 ? <Empty title="No tickets match your search or filters." message="Try a different search or remove a filter." action={<button type="button" className="btn zg-button zg-button--secondary" onClick={clearFilters}>Clear Filters</button>} /> : (
        <>
          {!isMobile ? <div className="my-tickets__table-wrap">
            <table className="my-tickets__table"><caption className="visually-hidden">Your support tickets</caption><thead><tr><SortHeader column="ticketNumber" label="Ticket No." sortBy={sortBy} sortOrder={sortOrder} onSort={changeSort} /><SortHeader column="createdAt" label="Created Date" sortBy={sortBy} sortOrder={sortOrder} onSort={changeSort} /><th scope="col">Summary</th><th scope="col">Category</th><th scope="col" className="my-tickets__system-column">Related System</th><th scope="col">Requested Priority</th><th scope="col">Current Status</th><SortHeader column="updatedAt" label="Last Updated" sortBy={sortBy} sortOrder={sortOrder} onSort={changeSort} className="my-tickets__updated-column" /></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><a href={`#/tickets/${ticket.id}`}>{ticket.ticketNumber}</a></td><td>{formatDate(ticket.createdAt)}</td><td className="my-tickets__summary" title={ticket.summary}>{ticket.summary}</td><td>{ticket.category.name}</td><td className="my-tickets__system-column">{ticket.relatedSystem.name}</td><td><Badge variant={priorityVariant(ticket.requestedPriority)}>{ticket.requestedPriority}</Badge></td><td><Badge variant="success">{ticket.currentStatus}</Badge></td><td>{formatDate(ticket.updatedAt)}</td></tr>)}</tbody></table>
          </div> : <div className="my-tickets__cards">{tickets.map((ticket) => <article className="my-tickets__card" key={ticket.id}><a href={`#/tickets/${ticket.id}`} className="my-tickets__card-number">{ticket.ticketNumber}</a><p className="my-tickets__card-summary">{ticket.summary}</p><dl><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>Created Date</dt><dd>{formatDate(ticket.createdAt)}</dd></div></dl><div className="my-tickets__badges"><Badge variant={priorityVariant(ticket.requestedPriority)}>{ticket.requestedPriority}</Badge><Badge variant="success">{ticket.currentStatus}</Badge></div></article>)}</div>}
          <footer className="my-tickets__pagination"><span>Showing {firstShown} to {lastShown} of {meta.totalItems} tickets</span><div className="my-tickets__page-controls"><FormSelect id="ticket-page-size" label="Page size" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} options={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }]} /><button type="button" className="btn zg-button zg-button--secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>{Array.from({ length: meta.totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" className={`btn my-tickets__page ${pageNumber === page ? "is-current" : ""}`} aria-current={pageNumber === page ? "page" : undefined} key={pageNumber} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button type="button" className="btn zg-button zg-button--secondary" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></footer>
        </>
      )}
    </div>
  );
}