import type { ReactNode } from "react";

type Stage = "alive" | "forgotten" | "buried" | "ancient" | "archived";

const STAGES: { stage: Stage; label: string; days: string; epitaph: string }[] = [
  { stage: "alive", label: "Alive", days: "Pushed in the last 30 days", epitaph: "Still breathing. Fresh flowers daily." },
  { stage: "forgotten", label: "Forgotten", days: "31 to 90 days", epitaph: "Gone quiet. The moss is curious." },
  { stage: "buried", label: "Buried", days: "91 to 365 days", epitaph: "Laid to rest. A crack runs through the README." },
  { stage: "ancient", label: "Ancient", days: "More than a year", epitaph: "Leaning, cracked, half swallowed by the earth." },
  { stage: "archived", label: "Archived", days: "Any age, once archived", epitaph: "Chained shut. Disturb at your own risk." },
];

const STONE: Record<Stage, string> = {
  alive: "#9aa0b4",
  forgotten: "#7d8296",
  buried: "#666b7d",
  ancient: "#535767",
  archived: "#6d7182",
};

const MOSS = "#5f7a4c";

/** One headstone that ages with the stage: moss, cracks, a lean, or a chain. */
function Headstone({ stage }: { stage: Stage }) {
  const tilt = stage === "ancient" ? -7 : stage === "buried" ? 3 : 0;
  return (
    <svg viewBox="0 0 140 170" className="h-44 w-auto sm:h-52" aria-hidden="true">
      <ellipse cx="70" cy="160" rx="62" ry="10" fill="#141933" />
      <g transform={`rotate(${tilt} 70 158)`}>
        <path
          d={
            stage === "ancient"
              ? "M30 158V72a40 40 0 0 1 52-38l-6 9 10 2 3-4a40 40 0 0 1 21 31v86z"
              : "M30 158V72a40 40 0 0 1 80 0v86z"
          }
          fill={STONE[stage]}
          stroke="#1a1e33"
          strokeWidth="3"
        />
        <path d="M44 74a26 26 0 0 1 52 0" fill="none" stroke="#1a1e33" strokeOpacity=".35" strokeWidth="2" />
        <text x="70" y="104" textAnchor="middle" fontFamily="var(--font-display)" fontSize="22" fill="#262a40">
          RIP
        </text>
        <path d="M52 118h36M56 128h28" stroke="#262a40" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />

        {(stage === "buried" || stage === "ancient") && (
          <path d="M84 40l-8 22 9 12-10 18" fill="none" stroke="#1a1e33" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {stage === "ancient" && (
          <path d="M40 132l12 8-4 10" fill="none" stroke="#1a1e33" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {stage !== "alive" && stage !== "archived" && (
          <g fill={MOSS}>
            <ellipse cx="40" cy="152" rx={stage === "forgotten" ? 10 : 18} ry="8" opacity=".9" />
            {stage !== "forgotten" && <ellipse cx="100" cy="150" rx="14" ry="9" opacity=".85" />}
            {stage === "ancient" && (
              <>
                <ellipse cx="62" cy="56" rx="16" ry="7" opacity=".8" />
                <ellipse cx="34" cy="100" rx="7" ry="14" opacity=".75" />
              </>
            )}
          </g>
        )}
        {stage === "archived" && (
          <g stroke="#2b2f45" strokeWidth="4" fill="none">
            <path d="M26 112l88 26M26 140l88-26" />
            <rect x="60" y="118" width="20" height="18" rx="3" fill="#b9934c" stroke="#3b2f18" strokeWidth="2.5" />
            <path d="M64 118v-6a6 6 0 0 1 12 0v6" stroke="#3b2f18" strokeWidth="3" />
          </g>
        )}
      </g>
      {stage === "alive" && (
        <g>
          <path d="M58 158l-6-20M70 158v-24M82 158l6-20" stroke="#4d6b3c" strokeWidth="2.5" />
          <circle cx="52" cy="136" r="5" fill="#e8b45a" />
          <circle cx="70" cy="132" r="5.5" fill="#e98a7a" />
          <circle cx="88" cy="136" r="5" fill="#e8b45a" />
        </g>
      )}
    </svg>
  );
}

const MARKERS = [
  { stars: "0 to 4 stars", name: "Gravestone" },
  { stars: "5 to 19 stars", name: "Decorative cross" },
  { stars: "20 to 99 stars", name: "Elaborate obelisk" },
  { stars: "100+ stars", name: "Monument" },
];

/** The four marker sizes side by side on one plot of ground. */
function MarkerRow() {
  const stone = "#7d8296";
  const edge = "#1a1e33";
  return (
    <svg viewBox="0 0 880 300" className="w-full" aria-hidden="true">
      <path d="M0 262 C200 250 680 252 880 262 V300 H0Z" fill="#141933" />
      <g stroke={edge} strokeWidth="3" fill={stone}>
        <path d="M80 262v-70a30 30 0 0 1 60 0v70z" />
        <path d="M305 262v-22h-20v-12h70v12h-20v22z" />
        <path d="M310 228v-58h-24v-18h24v-26h20v26h24v18h-24v58z" />
        <path d="M520 262v-16h-14v-14h88v14h-14v16z" />
        <path d="M528 232l8-150 14-20 14 20 8 150z" />
        <path d="M650 262v-14h200v14z" />
        <path d="M664 248v-18h172v18z" />
        <path d="M676 230v-96h148v96z" />
        <path d="M664 134l86-62 86 62z" />
        <path d="M698 230v-80M726 230v-80M774 230v-80M802 230v-80" fill="none" strokeWidth="5" />
        <path d="M736 230v-54a14 14 0 0 1 28 0v54z" fill="#262a40" />
      </g>
      <circle cx="750" cy="108" r="7" fill="#e8b45a" />
      <g fill="#e8b45a">
        <path d="M550 50l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7-5.5-4.5 7-.5z" />
      </g>
    </svg>
  );
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>;
}

const STEPS = [
  { n: "I", title: "Speak a name", body: "Type any GitHub username at the gates. Only public repositories are ever dug up." },
  { n: "II", title: "Walk the grounds", body: "Steer the caretaker with W A S D. Hold Shift to hurry past the older plots." },
  { n: "III", title: "Read the stones", body: "Step close to a grave to read its epitaph, language, stars and last push." },
];

export function LandingSections() {
  return (
    <div className="relative bg-[linear-gradient(#0e1126,#0c0f1d_30%)]">
      <div aria-hidden="true" className="fog pointer-events-none absolute inset-x-0 top-0 h-64" />

      <section id="rites" className="relative mx-auto max-w-6xl scroll-mt-8 px-4 py-24 sm:px-8">
        <Reveal className="text-center">
          <p className="text-sm tracking-[0.3em] text-lichen uppercase">The rites</p>
          <h2 className="inscription mt-3 font-serif text-4xl italic sm:text-6xl">How a repository is laid to rest</h2>
          <p className="mx-auto mt-4 max-w-xl text-bone/70">
            Every grave ages from the day of its last push. Leave a project alone long enough and nature takes it back.
          </p>
        </Reveal>
        <div className="mt-16 grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
          {STAGES.map(({ stage, label, days, epitaph }) => (
            <Reveal key={stage} className="flex flex-col items-center text-center">
              <Headstone stage={stage} />
              <h3 className="mt-4 font-serif text-2xl text-bone">{label}</h3>
              <p className="mt-1 text-sm font-medium text-lantern/90">{days}</p>
              <p className="mt-2 max-w-[18ch] text-sm text-lichen italic">{epitaph}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-8">
        <Reveal className="text-center">
          <p className="text-sm tracking-[0.3em] text-lichen uppercase">The plots</p>
          <h2 className="inscription mt-3 font-serif text-4xl italic sm:text-6xl">Stars buy grander stones</h2>
          <p className="mx-auto mt-4 max-w-xl text-bone/70">
            A forgotten script gets a humble slab. A repository the world starred gets a mausoleum it can be proud of.
          </p>
        </Reveal>
        <Reveal className="mt-14">
          <MarkerRow />
          <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            {MARKERS.map(({ stars, name }) => (
              <div key={name}>
                <p className="font-serif text-xl text-bone">{name}</p>
                <p className="text-sm text-lichen">{stars}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-5xl px-4 py-24 sm:px-8">
        <Reveal className="text-center">
          <p className="text-sm tracking-[0.3em] text-lichen uppercase">The visit</p>
          <h2 className="inscription mt-3 font-serif text-4xl italic sm:text-6xl">Bring a lantern</h2>
        </Reveal>
        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <li key={n} className="reveal slab p-6">
              <p className="font-serif text-3xl text-lantern italic">{n}</p>
              <h3 className="mt-2 font-serif text-2xl text-bone">{title}</h3>
              <p className="mt-2 text-bone/70">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden px-4 pt-24 pb-16 text-center">
        <Reveal>
          <h2 className="inscription font-serif text-5xl italic sm:text-7xl">Who will you dig up?</h2>
          <p className="mx-auto mt-4 max-w-md text-bone/70">Yours, a friend&apos;s, or a famous developer&apos;s. Every account has a few bodies buried.</p>
          <a href="#top" className="control control-primary mt-8 min-h-12 px-7 text-lg">
            Back to the gates
          </a>
        </Reveal>
        <footer className="mt-24 border-t border-bone/10 pt-8 text-sm text-lichen">
          <p className="font-serif text-lg text-bone/60 italic">
            &ldquo;Here lies a side project. It was going to be great.&rdquo;
          </p>
          <p className="mt-3">
            Made by{" "}
            <a href="https://github.com/goprocker" className="text-bone/80 underline-offset-4 hover:text-bone hover:underline">
              Gopinath
            </a>
          </p>
        </footer>
      </section>
    </div>
  );
}
