type BadgeVariant = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={['zg-badge', className].filter(Boolean).join(' ')}
      data-variant={variant}
      aria-live="polite"
    >
      {children}
    </span>
  );
}

export type { BadgeVariant };
