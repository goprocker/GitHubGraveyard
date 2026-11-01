import type { Metadata } from "next";

import { GraveyardExperience } from "@/components/ui/GraveyardExperience";

export const metadata: Metadata = {
  title: "My graveyard | GitHub Graveyard",
  description: "A private 3D cemetery of my GitHub repositories.",
};

export default function GraveyardPage() {
  return <GraveyardExperience />;
}
