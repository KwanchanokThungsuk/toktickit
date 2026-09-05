export interface EmptyProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function Empty({
  title = "No results found",
  message = "There is nothing to show right now.",
  action,
  className = "",
}: EmptyProps) {
  return (
    <div className={['zg-state', 'zg-state--empty', className].filter(Boolean).join(' ')}>
      <h3 className="zg-state__title">{title}</h3>
      <p className="zg-state__message">{message}</p>
      {action ? <div className="zg-state__action">{action}</div> : null}
    </div>
  );
}
