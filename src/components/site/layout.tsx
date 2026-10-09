import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-5 sm:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "journal-kicker text-[11px] font-medium tracking-[0.22em] text-brand uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}
