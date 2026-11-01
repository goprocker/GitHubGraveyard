import Link from "next/link";
import type { ReactNode } from "react";

interface StateMessageProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function StateMessage({ title, children, actions }: StateMessageProps) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-start justify-center gap-5 px-6 sm:px-16">
      <h1 className="inscription max-w-[16ch] font-serif text-5xl leading-none italic sm:text-7xl">{title}</h1>
      <div className="max-w-md text-lg leading-relaxed text-bone/80">{children}</div>
      <div className="flex flex-wrap gap-2">
        {actions}
        <Link className="control border-bone/25" href="/">
          Back to the landing page
        </Link>
      </div>
    </main>
  );
}
