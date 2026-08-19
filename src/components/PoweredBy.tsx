type PoweredByProps = {
  className?: string;
};

/** Subtle product attribution shown at the bottom of app surfaces. */
export function PoweredBy({ className = "" }: PoweredByProps) {
  return (
    <p
      className={`text-center text-xs text-text-muted/50 dark:text-gray-400/40 ${className}`.trim()}
    >
      Crew Dispatch
      {" · "}
      <a href="/privacy" className="hover:underline">
        Privacy
      </a>
      {" · "}
      <a href="/terms" className="hover:underline">
        Terms
      </a>
    </p>
  );
}
