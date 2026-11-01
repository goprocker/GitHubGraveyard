export function LoadingSequence() {
  return (
    <main
      role="status"
      className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-4 text-center"
    >
      <svg aria-hidden="true" viewBox="0 0 40 64" className="lantern-sway h-20 w-12">
        <path d="M20 0V14" stroke="#a8a58f" strokeWidth="2" />
        <path d="M11 20 20 13 29 20V46L25 52H15L11 46Z" fill="#e8b45a" stroke="#a8a58f" strokeWidth="2" />
      </svg>
      <p className="font-serif text-3xl italic">Reading your headstones</p>
    </main>
  );
}
