import type { ComponentProps, ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
      </header>
      {children}
    </main>
  );
}

export function SectionCard({ title, description, children, actions }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function StatusMessage({
  tone,
  children,
}: {
  tone: 'info' | 'warning' | 'error' | 'success';
  children: ReactNode;
}) {
  const toneClasses = {
    info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
    error: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100',
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}

export function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
      {children}
      {hint ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span> : null}
    </label>
  );
}

const inputClassName = 'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500';

export function TextInput(props: ComponentProps<'input'>) {
  return <input {...props} className={`${inputClassName} ${props.className ?? ''}`.trim()} />;
}

export function SelectInput(props: ComponentProps<'select'>) {
  return <select {...props} className={`${inputClassName} ${props.className ?? ''}`.trim()} />;
}

export function TextAreaInput(props: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`${inputClassName} ${props.className ?? ''}`.trim()} />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
      {children}
    </div>
  );
}

export function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-950/95 p-4 text-xs leading-6 text-zinc-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function DataList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{item.label}</dt>
          <dd className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

