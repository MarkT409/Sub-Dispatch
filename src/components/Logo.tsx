import Image from "next/image";

type LogoProps = {
  className?: string;
};

const logoClass = "h-12 w-auto sm:h-14";

/** Crew Dispatch chrome CD mark (no Lantana branding). */
export function Logo({ className = logoClass }: LogoProps) {
  return (
    <Image
      src="/cd-chrome-icon.png"
      alt="Crew Dispatch"
      width={512}
      height={512}
      className={className}
      priority
    />
  );
}
