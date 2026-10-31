import type { Metadata } from "next";

import { GraveyardExperience } from "@/components/ui/GraveyardExperience";

export const metadata: Metadata = {
  title: "Demo graveyard | GitHub Graveyard",
  description: "A sample cemetery of invented repositories.",
};

export default function DemoPage() {
  return <GraveyardExperience username="demo" demo />;
}
