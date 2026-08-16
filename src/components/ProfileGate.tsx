"use client";

import { useMember } from "@/lib/client/useMember";

/**
 * Bloque l'accès tant que la personne n'a pas choisi son profil sur cet
 * appareil. Pas d'auth en v0 : juste une identité mémorisée localement.
 */
export function ProfileGate({
  children,
}: {
  children: (memberId: string, currentName: string) => React.ReactNode;
}) {
  const { members, memberId, currentMember, setMemberId, loading, error } = useMember();

  if (loading) {
    return <p className="p-6 text-ink/50">Chargement…</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-accent">{error}</p>;
  }

  if (!memberId || !currentMember) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h2 className="mb-4 font-display text-lg">Qui es-tu ?</h2>
        <div className="flex flex-col gap-2">
          {members?.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className="rounded-sm border border-ink/20 bg-paper px-4 py-3 text-left font-display text-lg hover:border-ink"
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <>{children(memberId, currentMember.name)}</>;
}
