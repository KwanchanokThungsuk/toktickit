export interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={['zg-state', 'zg-state--error', className].filter(Boolean).join(' ')} role="alert">
      <h3 className="zg-state__title">{title}</h3>
      <p className="zg-state__message">{message}</p>
      {action ? <div className="zg-state__action">{action}</div> : null}
    </div>
  );
}
