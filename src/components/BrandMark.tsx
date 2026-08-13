type BrandMarkProps = {
  className?: string;
};

/** Text wordmark for Sub-Dispatch (avoids parent-company logo in the product UI). */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span
      className={`font-display text-2xl font-bold tracking-tight text-text-primary ${className}`.trim()}
    >
      Sub-Dispatch
    </span>
  );
}
