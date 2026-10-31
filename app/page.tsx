import { LandingBackdrop } from "@/components/ui/LandingBackdrop";
import { LandingForm } from "@/components/ui/LandingForm";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 items-end justify-center overflow-hidden px-4 pt-10">
      <LandingBackdrop />
      <LandingForm />
    </main>
  );
}
