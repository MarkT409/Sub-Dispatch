import Image from "next/image";

type LogoProps = {
  className?: string;
};

const logoClass = "h-12 w-auto sm:h-14";

export function Logo({ className = logoClass }: LogoProps) {
  return (
    <Image
      src="/lantana-logo-horizontal.png"
      alt="Lantana Electric"
      width={400}
      height={100}
      className={`${className} dark:brightness-0 dark:invert`}
      priority
    />
  );
}
