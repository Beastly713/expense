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
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
          error
            ? 'border-red-500 bg-red-50 text-neutral-900'
            : 'border-neutral-300 bg-white text-neutral-900 focus:border-neutral-500'
        }`}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}