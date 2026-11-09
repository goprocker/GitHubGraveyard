import type { Metadata } from "next";
import { Suspense } from "react";

import { GraveyardExperience } from "@/components/ui/GraveyardExperience";

export const metadata: Metadata = {
  title: "Graveyard | GitHub Graveyard",
  description: "A 3D cemetery of GitHub repositories.",
};

export default function GraveyardPage() {
  return (
    <Suspense>
      <GraveyardExperience />
    </Suspense>
  );
}
