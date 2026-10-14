import { classNames } from "@/lib/format";

export function inputClass(hasError?: boolean): string {
  return classNames("input", hasError && "input-error");
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="hint">{hint}</p> : null}
      {error ? (
        <p className="error-text" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
