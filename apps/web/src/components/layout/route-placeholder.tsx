interface RoutePlaceholderProps {
  title: string;
  routePath: string;
  description: string;
}

export function RoutePlaceholder({
  title,
  routePath,
  description,
}: RoutePlaceholderProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Phase 1 placeholder
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-6 rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-100">
          <span className="text-slate-400">Route</span> {routePath}
        </div>
      </div>
    </main>
  );
}