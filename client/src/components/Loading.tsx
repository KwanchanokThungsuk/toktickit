export interface LoadingProps {
  message?: string;
  className?: string;
}

export default function Loading({
  message = "Loading…",
  className = "",
}: LoadingProps) {
  return (
    <div className={['zg-state', 'zg-state--loading', className].filter(Boolean).join(' ')}>
      <span className="zg-state__spinner" aria-hidden="true" />
      <span className="zg-state__text">{message}</span>
    </div>
  );
}
