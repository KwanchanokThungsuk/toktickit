import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput({ id, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-input">
      <input {...props} id={inputId} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-input-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={inputId}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? "◉" : "◌"}
      </button>
    </span>
  );
}
