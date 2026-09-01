import type { ReactNode } from "react";

export interface NavItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface AppShellProps {
  children?: ReactNode;
  title?: string;
  navItems?: NavItem[];
  requesterName?: string;
  onChangeRequester?: () => void;
}

export default function AppShell({
  children,
  title = "TokTickIT",
  navItems = [
    { label: "My Tickets", href: "/tickets", current: true },
    { label: "Create Ticket", href: "/tickets/new" },
  ],
  requesterName = "Alex Morgan",
  onChangeRequester,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand" aria-label="TokTickIT home">
            <button type="button" className="app-header__logo" aria-label="TokTickIT home">
              T
            </button>
            <div className="app-header__wordmark">{title}</div>
          </div>

          <nav className="app-header__nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href ?? "#"}
                className={item.current ? "app-header__nav-item is-current" : "app-header__nav-item"}
                aria-current={item.current ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="app-header__user">
            <button type="button" className="app-header__menu" aria-label="Open navigation menu">
              <span />
              <span />
              <span />
            </button>

            <span className="app-header__requester" title={requesterName}>
              {requesterName}
            </span>

            <button
              type="button"
              className="app-header__action"
              onClick={onChangeRequester}
            >
              Change Requester
            </button>
          </div>
        </div>
      </header>

      <main className="app-shell__content">{children}</main>
    </div>
  );
}
