import * as React from "react";
import { cn } from "../../lib/utils";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  monospace?: boolean;
}

/**
 * Operator-console input field. Uppercase mono eyebrow label,
 * underline-style border that emphasises focus, optional hint/error row.
 */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, className, monospace, id, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="label-eyebrow">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-9 w-full bg-[color:var(--color-ink-1)] border border-[color:var(--color-rule)]",
            "px-3 text-[13px] text-[color:var(--color-text-0)] placeholder:text-[color:var(--color-text-3)]",
            "rounded-[3px] transition-colors",
            "focus:outline-none focus:border-[color:var(--color-acid)]",
            "focus:bg-[color:var(--color-ink-2)]",
            monospace && "font-mono tracking-[-0.01em]",
            error && "border-[color:var(--color-err)]",
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <p
            className={cn(
              "text-[11px] leading-tight",
              error
                ? "text-[color:var(--color-err)]"
                : "text-[color:var(--color-text-3)]",
            )}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
Field.displayName = "Field";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(({ label, hint, options, className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="label-eyebrow">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            "h-9 w-full appearance-none bg-[color:var(--color-ink-1)] border border-[color:var(--color-rule)]",
            "pl-3 pr-8 text-[13px] text-[color:var(--color-text-0)] rounded-[3px]",
            "focus:outline-none focus:border-[color:var(--color-acid)] focus:bg-[color:var(--color-ink-2)]",
            "transition-colors",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-[color:var(--color-text-3)]"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {hint && (
        <p className="text-[11px] leading-tight text-[color:var(--color-text-3)]">
          {hint}
        </p>
      )}
    </div>
  );
});
SelectField.displayName = "SelectField";
