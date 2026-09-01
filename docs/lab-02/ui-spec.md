# Lab 2 UI Specification — Zen Green Theme

**Project:** TokTickIT IT Service Desk
**Sprint:** Individual Sprint 2 — Requester Ticketing MVP with UI Foundation
**Stack:** React + TypeScript + Vite + Bootstrap 5
**Related documents:** `specification.md`, `api-spec.md`, `tests.md`

This document is binding for Lab 2 and is the reference every later sprint reuses. Later screens extend these rules rather than inventing a new visual system.

---

## 1. Color tokens

Declared once as CSS custom properties in `client/src/styles/theme.css` and referenced everywhere. No component hard-codes a hex value.

```css
:root {
  --zg-primary:        #006B3C;  /* app header, primary buttons, strong emphasis */
  --zg-secondary:      #0B7A46;  /* active tab, focus accent, links, hover */
  --zg-pale:           #EAF6EF;  /* selected rows, success surfaces, subtle emphasis */
  --zg-bg:             #F5F7F6;  /* page background */
  --zg-surface:        #FFFFFF;  /* cards and panels */
  --zg-border:         #D8E0DB;  /* neutral field and card border */
  --zg-text:           #1C2B24;  /* dark charcoal-green body text, not pure black */
  --zg-text-muted:     #5A6B62;  /* helper text, metadata, placeholders */
  --zg-readonly-bg:    #EFF2F0;  /* read-only field shading */
  --zg-error:          #A4262C;  /* error text and border */
  --zg-error-bg:       #FDF3F3;  /* error field background tint */
  --zg-warning:        #B26A00;  /* amber callouts and badges */
  --zg-warning-bg:     #FFF8E8;
  --zg-success:        #0B7A46;  /* success confirmation text */
  --zg-success-bg:     #EAF6EF;
  --zg-focus-ring:     rgba(11, 122, 70, 0.35);
}
```

**Usage rules**

| Token | Permitted use | Never used for |
|---|---|---|
| `--zg-primary` | App header bar, primary button fill, active nav underline | Body text, ordinary borders |
| `--zg-secondary` | Links, hover, focus ring, active tab | Large filled areas |
| `--zg-pale` | Selected row, success panel, section tint | Page background |
| `--zg-warning` | Genuine warnings and warning badges | Decoration, emphasis |
| `--zg-error` | Validation messages, invalid field border | General emphasis |

---

## 2. Typography and spacing

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page title (h1) | 1.75 rem | 600 | One per screen |
| Section heading (h2) | 1.25 rem | 600 | Card and group headers |
| Field label | 0.875 rem | 600 | Above the control, `--zg-text` |
| Body / input text | 1 rem | 400 | Minimum readable size |
| Helper and metadata | 0.8125 rem | 400 | `--zg-text-muted` |
| Validation message | 0.8125 rem | 500 | `--zg-error`, directly below the control |
| Badge | 0.75 rem | 600 | Uppercase not required; text always present |

Font stack: the Bootstrap 5 system stack. No web font is loaded.

**Spacing scale:** 4, 8, 12, 16, 24, 32, 48 px. Field vertical gap 16 px; label-to-control gap 4 px; control-to-validation-message gap 4 px; card padding 24 px desktop, 16 px mobile; section gap 24 px.

---

## 3. Control states

| State | Appearance |
|---|---|
| Editable | `--zg-surface` background, 1 px `--zg-border`, radius 6 px, height 40 px |
| Focused | 2 px `--zg-secondary` border plus 3 px `--zg-focus-ring` outline; always visible for keyboard users |
| Read-only | `--zg-readonly-bg` background, `--zg-border` border, `--zg-text` text, no caret, not focusable as an input |
| Invalid | `--zg-error` 1 px border, `--zg-error-bg` tint, `aria-invalid="true"`, message below |
| Disabled | 55 % opacity, `not-allowed` cursor, `disabled` attribute, non-activatable |
| Placeholder | `--zg-text-muted`, never used as a substitute for a label |

Read-only fields (Ticket Number, Ticket Date, Requester, Current Status) must be visually distinct from editable fields at a glance while remaining fully readable. They are rendered as read-only inputs or static text blocks, never as disabled inputs, so screen readers still announce their values.

**Multiline Description:** minimum 6 rows, `resize: vertical` only, `max-height` capped so resizing cannot break the layout.

---

## 4. Required-field marker and validation placement

- Required fields show a red asterisk after the label text, with `aria-hidden="true"` on the asterisk and `aria-required="true"` on the control.
- The asterisk indicates requirement; it never replaces a validation message.
- Validation messages appear immediately below the associated control, linked with `aria-describedby`. A summary banner at the top of the form is permitted **in addition to**, never instead of, field-level messages.
- On failed submission, focus moves to the first invalid control.
- Messages state what to do, not just what is wrong: "Summary must be between 10 and 150 characters."

---

## 5. Button hierarchy

| Level | Style | Use |
|---|---|---|
| Primary | `--zg-primary` fill, white text | Submit Ticket, Continue, Create Ticket |
| Secondary | White fill, `--zg-primary` border and text | Cancel, Back to My Tickets, Clear Filters |
| Tertiary | Text-only, `--zg-secondary` | Change Requester, inline links |
| Destructive | White fill, `--zg-error` border and text | Remove Attachment |
| Disabled | 55 % opacity, non-activatable | Any button whose action is unavailable |
| Busy | Spinner plus label text, `disabled`, `aria-busy="true"` | Submit while a request is in flight |

Every button carries visible text. Icons may support text but never replace it. Icon-only controls (sort toggles, download) carry an `aria-label` and a tooltip.

**Busy state text:** "Submitting…", "Uploading…", "Removing…". The label changes; the button width should not jump noticeably.

---

## 6. Application shell

- Header bar filled `--zg-primary`, height 56 px, containing: TokTickIT logo and wordmark (left), My Tickets and Create Ticket navigation (centre-left), Requester identity (right).
- Active navigation item marked with a 3 px underline in white plus `aria-current="page"`. Color alone never signals the active page.
- Requester identity shows the selected name and a Change Requester action.
- Below 768 px the navigation collapses into a hamburger toggle; the Requester name remains visible in the collapsed bar, truncated with an ellipsis and a `title` attribute if needed.
- Breadcrumb row below the header on Ticket Detail and the Selection screen, using `--zg-secondary` links.

---

## 7. Screen: Development Requester Selection

Centred card, maximum width 560 px, on `--zg-bg`.

**Elements:** TokTickIT title; explanatory text; Development Requester dropdown (required, asterisk); info callout in `--zg-pale`; a Lab 3 notice callout; Cancel (secondary) and Continue (primary) actions.

**Explanatory text:** "Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3."

| State | Presentation |
|---|---|
| Loading | Spinner with "Loading development requesters…"; Continue disabled |
| Loaded | Dropdown populated with active Requesters only; Continue disabled until a selection is made |
| Empty | Callout: "No active development requesters are available. Run the database seed and try again." Dropdown not rendered; Continue hidden |
| Failure | Error callout naming the failed action plus a Retry button; no dropdown |

The dropdown is a native `<select>` so it is keyboard accessible and usable on mobile without custom code.

---

## 8. Screen: Create Ticket

### 8.1 Layout

Single card, maximum width 960 px, centred.

1. **System-generated row** (read-only): Ticket Number, Ticket Date, Current Status, Requester. Before submission these show "Generated on submit" placeholders in `--zg-text-muted`, except Requester, which shows the selected Development Requester.
2. **Classification row:** Category, Related System, Requested Priority — three columns on desktop.
3. **Summary:** full width, single line.
4. **Description:** full width, multiline.
5. **Attachments:** file input, selected-file list, constraint helper text.
6. **Actions:** Cancel (secondary, left), Submit Ticket (primary, right).

Helper text under the attachment control: "JPG, PNG, WEBP, or PDF. Up to 5 MB per file, maximum 5 files."

### 8.2 States

| State | Presentation |
|---|---|
| Initial | Reference data loaded; Requested Priority defaults to Medium; Submit enabled |
| Loading reference data | Skeleton or spinner in the classification row; Submit disabled |
| Validation failure | Invalid controls styled per §3; messages below each; focus moves to the first invalid control; no API call is made |
| Submitting | Submit shows busy state and is disabled; all inputs read-only for the duration |
| Success | `--zg-pale` panel with a check icon **and** the text "Ticket created"; the official Ticket Number in 1.25 rem 600; actions "View Ticket" (primary) and "Create Another Ticket" (secondary) |
| API failure | Error callout above the actions naming the failed action with a Retry option; **all entered values preserved** |
| Invalid attachment | Rejected file listed with a red icon, its name, and the reason; valid files remain in the list |

### 8.3 Attachment selection presentation

Each selected file renders as a row: filename (truncated with `title`), size, state icon, and a remove-from-selection control.

| File state | Presentation |
|---|---|
| Valid, pending upload | Neutral border, "Ready" label |
| Uploading | Progress indicator, "Uploading…" |
| Uploaded | `--zg-pale` tint, "Attached" |
| Invalid | `--zg-error` border, reason text: "File is larger than 5 MB" / "File type is not supported" |
| Upload failed | `--zg-warning` tint, reason plus a Retry control |

---

## 9. Screen: My Tickets

### 9.1 Layout

Page title "My Tickets" with subtitle "View and track all of your support requests." Right-aligned: Clear Filters (secondary) and Create Ticket (primary).

**Filter bar** in a white surface card: search box (with magnifier icon and placeholder "Search by ticket number or summary…"), Category select, Related System select, Requested Priority select, Current Status select. Filters wrap to two rows on tablet and stack on mobile.

Each select opens with an "All …" option that clears that filter. The Current Status select offers **All Statuses** and **New** only, because `NEW` is the sole status a ticket can hold in Lab 2 (BR-02). The control is specified now so that later sprints extend its option list rather than add a new control to a settled layout. An IT Priority filter is **not** included — that field does not exist in Lab 2 and an empty control would be misleading.

### 9.2 Desktop table (≥ 992 px)

| Column | Sortable | Notes |
|---|---|---|
| Ticket No. | Yes | Link to Ticket Detail, `--zg-secondary` |
| Created Date | Yes | Default sort, descending |
| Summary | No | Truncated with ellipsis and `title` |
| Category | No | Plain text |
| Related System | No | Plain text |
| Requested Priority | No | Badge |
| Current Status | No | Badge |
| Last Updated | Yes | — |

IT Priority and Ticket Owner columns are **excluded** in Lab 2 — those values do not exist yet.

Sortable headers show an ascending/descending indicator icon and expose `aria-sort`. Row hover tints with `--zg-pale`.

### 9.3 Mobile cards (< 768 px)

The table is replaced by stacked cards, not a horizontally scrolling table. Each card shows Ticket Number (as the link and card title), Summary, Category, both badges, and Created Date. Minimum tap target 44 × 44 px.

Tablet (768–991 px) keeps the table but hides Related System and Last Updated.

### 9.4 Pagination

Below the list: "Showing X to Y of Z tickets" on the left; Previous, numbered pages, Next on the right. Current page filled `--zg-primary` with white text and `aria-current="page"`. Page size selector offers 10, 20, 50. Any change to search, filters, sort, or page size returns to page 1.

### 9.5 States

| State | Presentation |
|---|---|
| Loading | Skeleton rows (desktop) or skeleton cards (mobile); filters remain interactive |
| Loaded | List plus pagination metadata |
| **Empty** (no tickets at all) | Illustration-free panel: "You have not created any tickets yet." with a Create Ticket primary action |
| **No results** (filters active, nothing matched) | "No tickets match your search or filters." with a Clear Filters secondary action |
| Failure | Error callout with Retry; filter values preserved |

Empty and no-results are visually and textually distinct. This distinction is asserted in tests (AC-25, AC-26).

---

## 10. Screen: Requester Ticket Detail

### 10.1 Layout

Breadcrumb "My Tickets > Ticket Details" with a "Back to My Tickets" secondary action.

**Ticket information card** — every field read-only:

- Row 1: Ticket No., Ticket Date, Category, Related System
- Row 2: Requester, Requested Priority (badge), Current Status (badge)
- Row 3: Summary (full width)
- Row 4: Description (full width, multiline block)

Four columns on desktop, two on tablet, stacked on mobile.

**Excluded from this screen:** Public Comments, Internal Notes, Service Actions, Event Log, IT Priority, Ticket Owner, Resolution Summary, and any status control. The illustrative Lab 1 screenshot shows some of these; they are out of scope.

### 10.2 Attachment section

A separate card below the ticket information, clearly divided from it by a heading and spacing, so ticket data and attachment actions are never confused.

Header: "Attachments (n active of 5)" plus an Add Attachment primary action, disabled with a tooltip when five active attachments exist.

| Attachment state | Presentation |
|---|---|
| Active | White row: file-type icon, filename, size, upload date, Download (tertiary) and Remove (destructive) |
| Uploading | Progress indicator; row not yet actionable |
| Invalid | `--zg-error` border with the rejection reason; not persisted |
| Removed | `--zg-readonly-bg` row, filename in `--zg-text-muted` with strikethrough, "Removed" badge, removal date and reason shown; **no Download and no Remove control** |
| Unavailable | `--zg-warning` tint, "File unavailable" with a support hint |
| None | "No attachments have been added to this ticket." |

**Removal dialog:** modal titled "Remove attachment", showing the filename, a required "Reason for removal" textarea (5–200 characters), and the notice "The file will no longer be downloadable, but its record will remain visible." Actions: Cancel (secondary), Remove Attachment (destructive). Confirmation is mandatory; the reason field must pass validation before the action enables.

---

## 11. Badge rules

| Badge | Values | Style |
|---|---|---|
| Requested Priority | Low, Medium, High | Pill, 1 px border, tinted background: Low neutral gray-green, Medium `--zg-warning-bg` with `--zg-warning` text, High `--zg-error-bg` with `--zg-error` text |
| Current Status | New | Pill, `--zg-pale` background with `--zg-secondary` text |

Every badge shows its text label. Meaning is never carried by color alone (WCAG 1.4.1). Badge shape, height, and font size are identical across all screens.

---

## 12. Responsive rules

| Viewport | Rules |
|---|---|
| Desktop ≥ 992 px | Multi-column forms; ticket table; content max-width 1200 px, centred |
| Tablet 768–991 px | Two-column forms; table with two columns hidden; filters wrap to two rows |
| Mobile < 768 px | Single column; ticket cards; hamburger navigation; full-width buttons; 44 px minimum tap targets |
| All sizes | No horizontal page scrolling; no clipped labels; no overlapping messages; no hidden primary actions; attachment filenames truncated with ellipsis plus `title`, never overflowing |

Bootstrap grid breakpoints `md` (768 px) and `lg` (992 px) are used directly; no custom breakpoints are introduced.

---

## 13. Accessibility

- Every control has a programmatically associated `<label>`.
- Icon-only controls carry `aria-label` and a tooltip.
- Validation messages are linked with `aria-describedby` and announced via `role="alert"`.
- Focus order follows visual order; focus indicators are never removed.
- Modals trap focus, close on Escape, and return focus to the trigger.
- Loading regions use `aria-busy`; live regions announce completion.
- Color contrast is at least 4.5:1 for text and 3:1 for interface borders.
- The entire Create Ticket flow is completable with a keyboard alone (AC-33).

---

## 14. Visual inspection checklist

Completed per screen at each viewport and recorded in `tests.md`.

- [ ] Header uses `--zg-primary`; no stray hex values in components
- [ ] Active navigation item marked by underline plus `aria-current`, not color alone
- [ ] Editable and read-only fields are clearly distinguishable
- [ ] Every required field shows an asterisk **and** a validation message when empty
- [ ] Validation messages sit directly below their control
- [ ] Button hierarchy is consistent; only one primary action per screen region
- [ ] Submit shows a busy state and cannot be double-activated
- [ ] Badges are consistent in shape, size, and text across screens
- [ ] Empty state and no-results state are visibly different
- [ ] Removed attachments show metadata with no download control
- [ ] No clipping, overlap, or unintended horizontal scrolling at 375, 768, or 1280 px
- [ ] Focus indicator visible on every interactive element
- [ ] Loading, success, and failure states each render correctly

---

## 15. Screenshot paths

Captured by Playwright at 1280 × 800, 768 × 1024, and 375 × 812.

```
artifacts/lab-02/screenshots/
├── requester-selection/   loading.png, loaded.png, empty.png, failure.png
├── create-ticket/         desktop-initial.png, desktop-validation.png,
│                          desktop-submitting.png, desktop-success.png,
│                          desktop-api-failure.png, desktop-invalid-attachment.png,
│                          tablet-initial.png, mobile-initial.png
├── my-tickets/            desktop-list.png, desktop-filtered.png,
│                          desktop-empty.png, desktop-no-results.png,
│                          tablet-list.png, mobile-cards.png
└── ticket-detail/         desktop-detail.png, desktop-attachment-removed.png,
                           desktop-removal-dialog.png, tablet-detail.png,
                           mobile-detail.png
```

---

*Prepared with AI specification-agent assistance. Reviewed, corrected, and approved by the student.*