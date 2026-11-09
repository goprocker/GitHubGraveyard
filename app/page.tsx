import { ChevronDown } from "lucide-react";

import { LandingBackdrop } from "@/components/ui/LandingBackdrop";
import { LandingForm } from "@/components/ui/LandingForm";
import { LandingSections } from "@/components/ui/LandingSections";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section id="top" className="relative flex min-h-dvh items-center justify-center overflow-hidden">
        <LandingBackdrop />
        <LandingForm />
        <a
          href="#rites"
          className="dawn-late absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-sm text-bone/60 hover:text-bone"
        >
          Read the rites
          <ChevronDown aria-hidden="true" size={20} className="drift" />
        </a>
      </section>
      <LandingSections />
    </main>
  );
}
