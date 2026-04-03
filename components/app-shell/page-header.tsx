type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="max-w-4xl space-y-4">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      <div className="space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-3xl text-balance text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      </div>
    </header>
  );
}
