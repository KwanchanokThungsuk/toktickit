import type { SelectHTMLAttributes, ReactNode } from "react";

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: ReactNode;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export default function FormSelect({
  id,
  label,
  error,
  helperText,
  required = false,
  className = "",
  options,
  "aria-invalid": ariaInvalid,
  ...props
}: FormSelectProps) {
  const invalid = Boolean(error) || ariaInvalid === true;
  const describedBy = [
    helperText ? `${id}-hint` : undefined,
    invalid ? `${id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="zg-form-field">
      <label htmlFor={id} className="zg-form-label">
        {label}
        {required && (
          <span className="zg-form-required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <select
        id={id}
        className={[
          "zg-form-control",
          invalid ? "is-invalid" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {helperText && !error && (
        <div id={`${id}-hint`} className="zg-form-help">
          {helperText}
        </div>
      )}

      {error && (
        <div id={`${id}-error`} className="zg-form-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
