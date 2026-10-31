import Link from "next/link";
import type { ReactNode } from "react";

interface StateMessageProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function StateMessage({ title, children, actions }: StateMessageProps) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-4xl">{title}</h1>
      <div className="max-w-md text-lg text-lichen">{children}</div>
      <div className="flex flex-wrap justify-center gap-3">
        {actions}
        <Link className="control" href="/">
          Search for another username
        </Link>
      </div>
    </main>
  );
}
