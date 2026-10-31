import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-serif text-4xl">This plot is empty</h1>
      <p className="max-w-md text-lichen">
        That page doesn&apos;t exist. GitHub usernames contain only letters, numbers and hyphens.
      </p>
      <Link className="control" href="/">
        Search for a username
      </Link>
    </main>
  );
}
