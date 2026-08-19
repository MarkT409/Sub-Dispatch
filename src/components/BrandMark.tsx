type BrandMarkProps = {
  className?: string;
};

/** Text wordmark for Crew Dispatch. */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span
      className={`font-display text-2xl font-bold tracking-tight text-text-primary ${className}`.trim()}
    >
      Crew Dispatch
    </span>
  );
}
