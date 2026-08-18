"use client";

import { useCallback, useEffect, useState } from "react";
import type { Member } from "@/lib/types";

const STORAGE_KEY = "aparte:memberId";

/**
 * v0 n'a pas d'authentification : l'identité de chaque appareil (l'un des
 * 2 membres fixes du foyer) est attribuée automatiquement — créer une
 * session vaut Membre 1, la rejoindre vaut Membre 2 (voir la page
 * d'accueil et `ProfileGate`) — puis mémorisée en localStorage.
 */
export function useMember() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberId, setMemberIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const storedId = localStorage.getItem(STORAGE_KEY);
      try {
        const res = await fetch("/api/members");
        if (!res.ok) throw new Error(`API /api/members a répondu ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setMemberIdState(storedId);
        setMembers(data.members);
      } catch {
        if (cancelled) return;
        setError(
          "Impossible de charger vos profils pour le moment. Réessayez dans un instant."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMemberId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setMemberIdState(id);
  }, []);

  const currentMember = members?.find((m) => m.id === memberId) ?? null;

  return { members, memberId, currentMember, setMemberId, loading, error };
}
