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
  const { members, memberId, currentMember, setMemberId, loading } = useMember();

  if (loading) {
    return <p className="p-6 text-stone-500">Chargement…</p>;
  }

  if (!memberId || !currentMember) {
    return (
      <div className="mx-auto max-w-sm p-6">
        <h2 className="mb-4 text-lg font-medium">Qui es-tu ?</h2>
        <div className="flex flex-col gap-2">
          {members?.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-left hover:border-stone-900"
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
