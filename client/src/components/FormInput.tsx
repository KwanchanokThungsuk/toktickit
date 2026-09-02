import type { InputHTMLAttributes, ReactNode } from "react";

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helperText?: ReactNode;
  required?: boolean;
}

export default function FormInput({
  id,
  label,
  error,
  helperText,
  required = false,
  className = "",
  "aria-invalid": ariaInvalid,
  ...props
}: FormInputProps) {
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

      <input
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
      />

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
