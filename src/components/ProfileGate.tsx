"use client";

import { useEffect } from "react";
import { useMember } from "@/lib/client/useMember";

/**
 * Bloque l'accès à une session tant que l'identité de cet appareil n'est
 * pas connue. Pas d'auth en v0, pas de choix manuel non plus : le foyer a
 * exactement 2 membres fixes, et celui qui crée une session devient
 * Membre 1 (attribué au clic sur "Créer une session", voir la page
 * d'accueil) tandis que celui qui la rejoint via un code tapé devient
 * Membre 2 (idem, voir la page d'accueil). Ce composant ne gère que le cas
 * restant : l'arrivée directe sur une session (lien/QR code partagé) sans
 * être passé par ces actions — dans ce cas, on attribue Membre 2 par
 * défaut, uniquement si cet appareil n'a pas déjà une identité.
 */
export function ProfileGate({
  children,
}: {
  children: (memberId: string, currentName: string) => React.ReactNode;
}) {
  const { members, memberId, currentMember, setMemberId, loading, error } = useMember();

  useEffect(() => {
    if (loading || memberId || !members) return;
    const joiner = members[1] ?? members[0];
    if (joiner) setMemberId(joiner.id);
  }, [loading, memberId, members, setMemberId]);

  if (error) {
    return <p className="animate-fade-in p-6 text-center text-accent">{error}</p>;
  }

  if (loading || !memberId || !currentMember) {
    return <p className="animate-fade-in p-6 text-ink/50">Un instant…</p>;
  }

  return <>{children(memberId, currentMember.name)}</>;
}
