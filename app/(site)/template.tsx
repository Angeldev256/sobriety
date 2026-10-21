import type { ReactNode } from "react";

/** Re-mounts on every navigation, so each page eases in. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page flex flex-1 flex-col">{children}</div>;
}
