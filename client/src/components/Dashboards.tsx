import { useEffect, useState } from "react";
import { ApiError, type DashboardActionSummary, type DashboardDrillDown, type DashboardTicketSummary, fetchDashboardActions, fetchRequesterDashboard, fetchStaffDashboard, type RequesterDashboardResponse, type StaffDashboardResponse } from "../api";
import Empty from "./Empty";
import ErrorState from "./ErrorState";
import Loading from "./Loading";

function drillHref(drillDown: DashboardDrillDown) {
  const query = new URLSearchParams(drillDown.query).toString();
  return `#${drillDown.destination}${query ? `?${query}` : ""}`;
}
function bangkokDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
function MetricCard({ label, metric }: { label: string; metric: { count: number; drillDown: DashboardDrillDown } }) {
  return <a className="dashboard__metric" href={drillHref(metric.drillDown)}><span>{label}</span><strong>{metric.count}</strong><small>View matching items</small></a>;
}
function TicketPreview({ title, tickets, emptyText, staff = false, drillDown }: { title: string; tickets: DashboardTicketSummary[]; emptyText: string; staff?: boolean; drillDown?: DashboardDrillDown }) {
  return <section className="dashboard__preview"><header><h2>{title}</h2>{drillDown ? <a href={drillHref(drillDown)}>View all</a> : null}</header>{tickets.length === 0 ? <p className="dashboard__empty">{emptyText}</p> : <ul>{tickets.map(ticket => <li key={ticket.id}><a href={`#${staff ? "/staff/tickets" : "/tickets"}/${ticket.id}`}><b>{ticket.ticketNumber}</b><span>{ticket.summary}</span></a><div className="dashboard__row-meta"><span>{ticket.currentStatus}</span>{staff && ticket.itPriority ? <span>{ticket.itPriority}</span> : null}{staff ? <span>{ticket.assignedTo?.name ?? "Unassigned"}</span> : null}<time dateTime={ticket.resolutionTime ?? ticket.updatedAt}>{bangkokDate(ticket.resolutionTime ?? ticket.updatedAt)}</time>{ticket.resolutionTimeSource === "LEGACY_UPDATED_AT" ? <span className="dashboard__estimate">Estimated from last update</span> : null}</div></li>)}</ul>}</section>;
}
function ActionPreview({ actions, drillDown, title = "My Recent Actions" }: { actions: DashboardActionSummary[]; drillDown: DashboardDrillDown; title?: string }) {
  return <section className="dashboard__preview"><header><h2>{title}</h2><a href={drillHref(drillDown)}>View all</a></header>{actions.length === 0 ? <p className="dashboard__empty">No matching actions.</p> : <ul>{actions.map(action => <li key={action.id}><a href={`#/staff/tickets/${action.ticketId}?actionId=${action.id}`}><b>{action.ticketNumber}</b><span>{action.actionDescription}</span></a><div className="dashboard__row-meta"><span>{action.status}</span><time dateTime={action.completedAt ?? undefined}>{bangkokDate(action.completedAt)}</time></div></li>)}</ul>}</section>;
}
type DashboardAuthHandlers = { onAuthenticationLost?: () => void; onPasswordChangeRequired?: () => void };
function DashboardState<T>({ load, children, allowedHref, onAuthenticationLost, onPasswordChangeRequired }: { load: () => Promise<T>; children: (value: T, refresh: () => void, refreshing: boolean, stale: boolean) => React.ReactNode; allowedHref: string } & DashboardAuthHandlers) {
  const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [forbidden, setForbidden] = useState(false); const [stale, setStale] = useState(false);
  const refresh = () => {
    setLoading(true); setError(""); setForbidden(false);
    load().then((next) => { setData(next); setStale(false); }).catch((reason: unknown) => {
      if (reason instanceof ApiError && reason.code === "PASSWORD_CHANGE_REQUIRED") { setData(null); setStale(false); onPasswordChangeRequired?.(); }
      else if (reason instanceof ApiError && reason.status === 401) { setData(null); setStale(false); if (onAuthenticationLost) onAuthenticationLost(); else setForbidden(true); }
      else if (reason instanceof ApiError && reason.status === 403) { setData(null); setStale(false); setForbidden(true); }
      else { setError("Unable to refresh dashboard data. Please try again."); if (data) setStale(true); }
    }).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);
  if (forbidden) return <ErrorState title="Access denied" message="This dashboard is not available for your account." action={<a className="btn zg-button zg-button--secondary" href={allowedHref}>Go back</a>} />;
  if (!data && loading) return <div className="dashboard__loading" aria-busy="true" role="status" aria-live="polite"><Loading message="Loading dashboard…" /></div>;
  if (!data && error) return <ErrorState title="Unable to load dashboard" message={error} action={<button type="button" className="btn zg-button zg-button--secondary" onClick={refresh}>Retry</button>} />;
  return data ? <>{children(data, refresh, loading, stale)}</> : null;
}
function DashboardHeader({ data, refresh, refreshing, stale }: { data: { asOf: string; window: { start: string; end: string }; displayTimeZone: string }; refresh: () => void; refreshing: boolean; stale: boolean }) {
  return <header className="dashboard__header"><div><h1>Dashboard</h1><p>Updated {bangkokDate(data.asOf)} · {data.displayTimeZone}</p><p className="dashboard__window">Window: {bangkokDate(data.window.start)} to {bangkokDate(data.window.end)}</p>{stale ? <p className="dashboard__stale" role="status">Showing previous dashboard data because refresh failed.</p> : null}</div><button type="button" className="btn zg-button zg-button--secondary" disabled={refreshing} onClick={refresh}>{refreshing ? "Refreshing…" : "Refresh"}</button></header>;
}
export function RequesterDashboard({ onAuthenticationLost, onPasswordChangeRequired }: DashboardAuthHandlers) {
  return <DashboardState load={fetchRequesterDashboard} allowedHref="#/tickets" onAuthenticationLost={onAuthenticationLost} onPasswordChangeRequired={onPasswordChangeRequired}>{(data: RequesterDashboardResponse, refresh, refreshing, stale) => <div className="dashboard dashboard--requester"><DashboardHeader data={data} refresh={refresh} refreshing={refreshing} stale={stale} /><section className="dashboard__metrics" aria-label="Requester metrics"><MetricCard label="Open Tickets" metric={data.metrics.openTickets} /><MetricCard label="Waiting for Requester" metric={data.metrics.waitingForRequester} /><MetricCard label="Recently Updated" metric={data.metrics.recentlyUpdated} /><MetricCard label="Recently Resolved" metric={data.metrics.recentlyResolved} /></section><div className="dashboard__previews"><TicketPreview title="Attention Required" tickets={data.attentionRequired} emptyText="No matching tickets." drillDown={data.metrics.waitingForRequester.drillDown} /><TicketPreview title="Recent Tickets" tickets={data.recentTickets} emptyText="No matching tickets." drillDown={data.metrics.recentlyUpdated.drillDown} /><TicketPreview title="Recently Resolved" tickets={data.resolvedTickets} emptyText="No matching tickets." drillDown={data.metrics.recentlyResolved.drillDown} /></div></div>}</DashboardState>;
}
export function StaffDashboard({ onAuthenticationLost, onPasswordChangeRequired }: DashboardAuthHandlers) {
  return <DashboardState load={fetchStaffDashboard} allowedHref="#/staff/tickets" onAuthenticationLost={onAuthenticationLost} onPasswordChangeRequired={onPasswordChangeRequired}>{(data: StaffDashboardResponse, refresh, refreshing, stale) => <div className="dashboard dashboard--staff"><DashboardHeader data={data} refresh={refresh} refreshing={refreshing} stale={stale} /><section className="dashboard__metrics" aria-label="Operational metrics"><MetricCard label="Unassigned Tickets" metric={data.metrics.unassignedTickets} /><MetricCard label="My Tickets" metric={data.metrics.myTickets} /><MetricCard label="Recently Updated" metric={data.metrics.recentlyUpdated} /><MetricCard label="My Actions" metric={data.metrics.myActions} /></section><section className="dashboard__buckets"><div><h2>Tickets by Status</h2><div className="dashboard__bucket-grid">{Object.entries(data.metrics.byStatus).map(([status, metric]) => <a key={status} href={drillHref(metric.drillDown)}><span>{status}</span><b>{metric.count}</b></a>)}</div></div><div><h2>Active Tickets by IT Priority</h2><div className="dashboard__bucket-grid">{Object.entries(data.metrics.byItPriority).map(([priority, metric]) => <a key={priority} href={drillHref(metric.drillDown)}><span>{priority}</span><b>{metric.count}</b></a>)}</div></div></section><div className="dashboard__previews"><TicketPreview title="Recent Tickets" tickets={data.recentTickets} emptyText="No matching tickets." staff drillDown={data.metrics.recentlyUpdated.drillDown} /><TicketPreview title="Urgent Tickets" tickets={data.urgentTickets} emptyText="No matching tickets." staff drillDown={data.urgentDrillDown} /><ActionPreview actions={data.myRecentActions} drillDown={data.metrics.myActions.drillDown} /></div></div>}</DashboardState>;
}
export function DashboardActions({ query, onAuthenticationLost, onPasswordChangeRequired }: { query: Record<string, string> } & DashboardAuthHandlers) {
  return <DashboardState load={() => fetchDashboardActions(query)} allowedHref="#/staff/dashboard" onAuthenticationLost={onAuthenticationLost} onPasswordChangeRequired={onPasswordChangeRequired}>{(data, refresh, refreshing, stale) => {
    const page = Number(query.page ?? data.page);
    const pageHref = (nextPage: number) => drillHref({ destination: "/staff/dashboard/actions", query: { ...query, page: String(nextPage) } });
    return <div className="dashboard dashboard--actions"><DashboardHeader data={{ asOf: query.completedTo ?? "", window: { start: query.completedFrom ?? "", end: query.completedTo ?? "" }, displayTimeZone: "Asia/Bangkok" }} refresh={refresh} refreshing={refreshing} stale={stale} /><h2>My Completed Actions</h2>{data.items.length === 0 ? <Empty title="No matching actions." message="There are no completed actions in this dashboard window." /> : <ActionPreview title="Completed Actions" actions={data.items} drillDown={{ destination: "/staff/dashboard/actions", query }} />}{data.totalPages > 1 ? <nav className="dashboard__pagination" aria-label="Completed Actions pagination">{page > 1 ? <a className="btn zg-button zg-button--secondary" href={pageHref(page - 1)}>Previous</a> : <span className="btn zg-button zg-button--secondary" aria-disabled="true">Previous</span>}<span>Page {data.page} of {data.totalPages}</span>{page < data.totalPages ? <a className="btn zg-button zg-button--secondary" href={pageHref(page + 1)}>Next</a> : <span className="btn zg-button zg-button--secondary" aria-disabled="true">Next</span>}</nav> : null}</div>;
  }}</DashboardState>;
}
