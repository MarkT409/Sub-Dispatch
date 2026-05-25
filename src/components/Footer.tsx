export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <p className="font-display text-lg font-semibold text-text-primary">
          Lantana<span className="text-amber-500 dark:text-amber-400">.</span>
        </p>
        <p className="text-sm text-text-muted">
          © {year} Lantana. Electrical subcontracting — roughs & trims.
        </p>
      </div>
    </footer>
  );
}
