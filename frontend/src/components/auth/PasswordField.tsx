import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-ivory/[0.74]" htmlFor={id}>{label}</label>
      <div className={`input-premium mt-2 flex items-center gap-2 px-3 ${error ? "border-red-300/50" : ""}`}>
        <Lock size={16} className="shrink-0 text-ivory/[0.42]" />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete={autoComplete}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="min-h-12 w-full bg-transparent text-sm text-ivory outline-none placeholder:text-ivory/[0.32]"
        />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"} className="rounded-md p-2 text-ivory/[0.58] transition hover:bg-white/[0.08] hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled} onClick={onToggle}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="mt-2 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
