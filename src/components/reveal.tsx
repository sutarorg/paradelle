import type { ReactNode } from "react";

/** Lightweight structural wrapper retained for layout classes; entry animations are disabled. */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** Kept for call-site compatibility; entrance delays are no longer used. */
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}
