import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className = "", ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        className={`input ${error ? "input-invalid" : ""} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
