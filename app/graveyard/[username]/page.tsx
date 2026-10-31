import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GraveyardExperience } from "@/components/ui/GraveyardExperience";
import { isValidUsername } from "@/lib/username";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (!isValidUsername(username)) return { title: "GitHub Graveyard" };
  return {
    title: `${username}'s graveyard | GitHub Graveyard`,
    description: `Walk through a 3D cemetery of ${username}'s public GitHub repositories.`,
  };
}

export default async function GraveyardPage({ params }: Props) {
  const { username } = await params;
  if (!isValidUsername(username)) notFound();
  return <GraveyardExperience key={username.toLowerCase()} username={username} demo={false} />;
}
