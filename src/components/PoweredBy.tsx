type PoweredByProps = {
  className?: string;
};

/** Subtle product attribution shown at the bottom of app surfaces. */
export function PoweredBy({ className = "" }: PoweredByProps) {
  return (
    <p
      className={`text-center text-xs text-text-muted/50 dark:text-gray-400/40 ${className}`.trim()}
    >
      powered by Lantana Electric LLC
    </p>
  );
}
