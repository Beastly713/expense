interface AuthFormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
}

export function AuthFormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: AuthFormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-[color:var(--ledgerly-text)]"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`ledgerly-focus-ring w-full rounded-2xl border px-4 py-3 text-sm transition placeholder:text-[color:var(--ledgerly-faint)] ${
          error
            ? 'border-[color:var(--ledgerly-danger)] bg-[var(--ledgerly-danger-soft)] text-[color:var(--ledgerly-text)]'
            : 'border-[color:var(--ledgerly-border)] bg-white text-[color:var(--ledgerly-text)]'
        }`}
      />

      {error ? (
        <p className="mt-2 text-sm font-medium text-[color:var(--ledgerly-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}