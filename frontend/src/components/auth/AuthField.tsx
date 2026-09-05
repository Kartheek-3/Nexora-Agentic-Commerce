import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
};

export function AuthField({ label, error, icon, id, className = "", ...props }: AuthFieldProps) {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-ivory/[0.74]" htmlFor={id}>{label}</label>
      <div className={`input-premium mt-2 flex items-center gap-2 px-3 ${error ? "border-red-300/50" : ""}`}>
        {icon ? <span className="text-ivory/[0.42]">{icon}</span> : null}
        <input
          id={id}
          className={`min-h-12 w-full bg-transparent text-sm text-ivory outline-none placeholder:text-ivory/[0.32] ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
      </div>
      {error ? <p id={id ? `${id}-error` : undefined} className="mt-2 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
