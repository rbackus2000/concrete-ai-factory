type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: string;
};

export function PageHeader({ eyebrow, title, description, stats }: PageHeaderProps) {
  return (
    <header className="max-w-4xl space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-blue-600">{eyebrow}</p>
      <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {stats && (
        <p className="text-xs font-medium text-muted-foreground">
          {stats}
        </p>
      )}
    </header>
  );
}
