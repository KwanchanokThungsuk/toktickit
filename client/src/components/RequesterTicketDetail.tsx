  import { useEffect, useRef, useState } from "react";
  import { useRequester } from "./RequesterContext";
  import Badge from "./Badge";
  import ErrorState from "./ErrorState";
  import Loading from "./Loading";
  import {
    fetchTicket,
    type TicketDetail,
  } from "../api.detail";
  import {
    downloadAttachment,
    removeAttachment,
    uploadAttachment,
    type AttachmentMetadata,
  } from "../api";
  import type { BadgeVariant } from "./Badge";
  const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

  interface RequesterTicketDetailProps {
    ticketId: number;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function priorityVariant(
    priority: TicketDetail["requestedPriority"],
  ): BadgeVariant {
    if (priority === "HIGH") return "danger";
    if (priority === "MEDIUM") return "warning";
    return "neutral";
  }

  const previewableContentTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  export default function RequesterTicketDetail({
    ticketId,
  }: RequesterTicketDetailProps) {
    const { selectedRequester } = useRequester();

    const [ticket, setTicket] = useState<TicketDetail | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [attachmentError, setAttachmentError] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [removingAttachment, setRemovingAttachment] =
      useState<TicketDetail["attachments"][number] | null>(null);
    const [removalReason, setRemovalReason] = useState("");
    const [isRemoving, setIsRemoving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const removalReasonRef = useRef<HTMLTextAreaElement>(null);
    const removalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const removalDialogRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (removingAttachment) {
        removalReasonRef.current?.focus();
      } else if (removalTriggerRef.current?.isConnected) {
        removalTriggerRef.current.focus();
      }
    }, [removingAttachment]);

    useEffect(() => {
      let active = true;

      setTicket(null);
      setError("");
      setIsLoading(true);

      if (!selectedRequester) {
        setIsLoading(false);
        return undefined;
      }

      fetchTicket(ticketId, selectedRequester.id)
        .then((data) => {
          if (active) {
            setTicket(data);
          }
        })
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to load ticket",
            );
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [ticketId, selectedRequester]);

    if (isLoading) {
      return <Loading message="Loading ticket details..." />;
    }

    if (error) {
      return (
        <ErrorState
          title="Unable to load ticket"
          message={error}
          action={
            <a
              className="btn zg-button zg-button--secondary"
              href="#/tickets"
            >
              Back to My Tickets
            </a>
          }
        />
      );
    }

    if (!ticket) {
      return null;
    }

    const activeAttachmentCount = ticket.attachments.filter(
      (attachment) => !attachment.isRemoved,
    ).length;

    const removalReasonIsValid =
      removalReason.trim().length >= 5 &&
      removalReason.trim().length <= 200;

    function applyAttachmentUpdate(updated: AttachmentMetadata) {
      setTicket((current) =>
        current
          ? {
              ...current,
              attachments: current.attachments.map((attachment) =>
                attachment.id === updated.id ? updated : attachment,
              ),
            }
          : current,
      );
    }

    async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !selectedRequester) {
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError(
        `${file.name} exceeds the 5 MB attachment size limit.`,
      );
      return;
    }

    setAttachmentError("");
    setIsUploading(true);

    try {
      const attachment = await uploadAttachment(
        ticketId,
        file,
        selectedRequester.id,
      );

      setTicket((current) =>
        current
          ? {
              ...current,
              attachments: [
                ...current.attachments,
                attachment,
              ],
            }
          : current,
      );
    } catch (reason) {
      setAttachmentError(
        reason instanceof Error
          ? reason.message
          : "Unable to upload attachment",
      );
    } finally {
      setIsUploading(false);
    }
  }

    async function handleDownload(
      attachment: TicketDetail["attachments"][number],
    ) {
      if (!selectedRequester) {
        return;
      }

      setAttachmentError("");

      try {
        const { blob, filename } = await downloadAttachment(
          attachment.id,
          selectedRequester.id,
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
      } catch (reason) {
        setAttachmentError(
          reason instanceof Error
            ? reason.message
            : "Unable to download attachment",
        );
      }
    }

    async function handlePreview(
      attachment: TicketDetail["attachments"][number],
    ) {
      if (!selectedRequester) {
        return;
      }

      const previewWindow = window.open("", "_blank");

      if (!previewWindow) {
        setAttachmentError("Unable to open attachment preview");
        return;
      }

      setAttachmentError("");

      try {
        const { blob } = await downloadAttachment(
          attachment.id,
          selectedRequester.id,
        );

        const url = URL.createObjectURL(blob);

        previewWindow.location.href = url;

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      } catch (reason) {
        previewWindow.close();

        setAttachmentError(
          reason instanceof Error
            ? reason.message
            : "Unable to preview attachment",
        );
      }
    }

    async function confirmRemoval() {
      if (
        !selectedRequester ||
        !removingAttachment ||
        !removalReasonIsValid
      ) {
        return;
      }

      setAttachmentError("");
      setIsRemoving(true);

      try {
        const removed = await removeAttachment(
          removingAttachment.id,
          removalReason.trim(),
          selectedRequester.id,
        );

        applyAttachmentUpdate(removed);

        setRemovingAttachment(null);
        setRemovalReason("");
      } catch (reason) {
        setAttachmentError(
          reason instanceof Error
            ? reason.message
            : "Unable to remove attachment",
        );
      } finally {
        setIsRemoving(false);
      }
    }

    function closeRemovalDialog() {
      if (isRemoving) {
        return;
      }

      setRemovingAttachment(null);
      setRemovalReason("");
    }

    function handleRemovalDialogKeyDown(
      event: React.KeyboardEvent<HTMLElement>,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRemovalDialog();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        removalDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]',
        ) ?? [],
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    return (
      <div className="ticket-detail">
        <div className="ticket-detail__breadcrumb">
          <a href="#/tickets">My Tickets</a>
          <span aria-hidden="true">&gt;</span>
          <span>Ticket Details</span>
        </div>

        <header className="ticket-detail__header">
          <div>
            <h1>Ticket Details</h1>
            <p>{ticket.ticketNumber}</p>
          </div>

          <a
            className="btn zg-button zg-button--secondary"
            href="#/tickets"
          >
            Back to My Tickets
          </a>
        </header>

        <section
          className="ticket-detail__panel"
          aria-labelledby="ticket-information-heading"
        >
          <h2 id="ticket-information-heading">
            Ticket Information
          </h2>

          <dl className="ticket-detail__grid">
            <div>
              <dt>Ticket No.</dt>
              <dd>{ticket.ticketNumber}</dd>
            </div>

            <div>
              <dt>Ticket Date</dt>
              <dd>{formatDate(ticket.createdAt)}</dd>
            </div>

            <div>
              <dt>Category</dt>
              <dd>{ticket.category.name}</dd>
            </div>

            <div>
              <dt>Related System</dt>
              <dd>{ticket.relatedSystem.name}</dd>
            </div>

            <div>
              <dt>Requester</dt>
              <dd>{ticket.requester.name}</dd>
            </div>

            <div>
              <dt>Requested Priority</dt>
              <dd>
                <Badge
                  variant={priorityVariant(
                    ticket.requestedPriority,
                  )}
                >
                  {ticket.requestedPriority}
                </Badge>
              </dd>
            </div>

            <div>
              <dt>Current Status</dt>
              <dd>
                <Badge variant="success">
                  {ticket.currentStatus}
                </Badge>
              </dd>
            </div>

            <div className="ticket-detail__wide">
              <dt>Summary</dt>
              <dd>{ticket.summary}</dd>
            </div>

            <div className="ticket-detail__wide">
              <dt>Description</dt>
              <dd className="ticket-detail__description">
                {ticket.description}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="ticket-detail__panel"
          aria-labelledby="attachments-heading"
        >
          <div className="ticket-detail__attachment-header">
            <h2 id="attachments-heading">
              Attachments ({activeAttachmentCount} active of 5)
            </h2>

            <button
              type="button"
              className="btn zg-button zg-button--primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                activeAttachmentCount >= 5 || isUploading
              }
              title={
                activeAttachmentCount >= 5
                  ? "Maximum 5 active attachments allowed"
                  : undefined
              }
            >
              {isUploading ? "Uploading…" : "Add Attachment"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(event) => void handleUpload(event)}
          />

          {attachmentError ? (
            <div
              className="ticket-detail__attachment-error"
              role="alert"
            >
              {attachmentError}
            </div>
          ) : null}

          {ticket.attachments.length === 0 ? (
            <p className="ticket-detail__muted">
              No attachments have been added to this ticket.
            </p>
          ) : (
            <ul className="ticket-detail__attachments">
              {ticket.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className={
                    attachment.isRemoved ? "is-removed" : ""
                  }
                >
                  <div>
                    <strong
                      className={
                        attachment.isRemoved
                          ? "ticket-detail__removed-name"
                          : ""
                      }
                      title={attachment.originalFilename}
                    >
                      {attachment.originalFilename}
                    </strong>

                    <span>
                      {formatFileSize(attachment.fileSize)} ·{" "}
                      {attachment.contentType} ·{" "}
                      {formatDate(attachment.uploadedAt)}
                    </span>

                    {attachment.isRemoved ? (
                      <span>
                        Removed
                        {attachment.removedAt
                          ? ` on ${formatDate(
                              attachment.removedAt,
                            )}`
                          : ""}
                        {attachment.removedReason
                          ? `: ${attachment.removedReason}`
                          : ""}
                      </span>
                    ) : null}
                  </div>

                  {attachment.isRemoved ? (
                    <Badge variant="neutral">
                      Removed
                    </Badge>
                  ) : (
                    <div className="ticket-detail__attachment-actions">
                      {previewableContentTypes.has(
                        attachment.contentType.toLowerCase(),
                      ) ? (
                        <button
                          type="button"
                          className="btn ticket-detail__preview-button"
                          onClick={() =>
                            void handlePreview(attachment)
                          }
                          aria-label={`Preview ${attachment.originalFilename}`}
                        >
                          Preview
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="btn ticket-detail__download-button"
                        onClick={() =>
                          void handleDownload(attachment)
                        }
                        aria-label={`Download ${attachment.originalFilename}`}
                      >
                        <span aria-hidden="true">↓</span>
                        Download
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={(event) => {
                          removalTriggerRef.current =
                            event.currentTarget;
                          setRemovingAttachment(attachment);
                          setRemovalReason("");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {removingAttachment ? (
          <div
            className="ticket-detail__dialog-backdrop"
            role="presentation"
          >
            <section
              ref={removalDialogRef}
              className="ticket-detail__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-attachment-heading"
              onKeyDown={handleRemovalDialogKeyDown}
            >
              <h2 id="remove-attachment-heading">
                Remove attachment
              </h2>

              <p>
                Remove{" "}
                <strong>
                  {removingAttachment.originalFilename}
                </strong>
                ? The file will no longer be downloadable, but
                its record will remain visible.
              </p>

              <label htmlFor="removal-reason">
                Reason for removal
              </label>

              <textarea
                ref={removalReasonRef}
                id="removal-reason"
                value={removalReason}
                onChange={(event) =>
                  setRemovalReason(event.target.value)
                }
                minLength={5}
                maxLength={200}
                rows={3}
              />

              <p className="ticket-detail__muted">
                5–200 characters
              </p>

              <div className="ticket-detail__dialog-actions">
                <button
                  type="button"
                  className="btn zg-button zg-button--secondary"
                  disabled={isRemoving}
                  onClick={closeRemovalDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  disabled={
                    !removalReasonIsValid || isRemoving
                  }
                  aria-busy={isRemoving}
                  onClick={() => void confirmRemoval()}
                >
                  {isRemoving
                    ? "Removing…"
                    : "Remove Attachment"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }
