"use client";

import { useCallback, useEffect, useState } from "react";
import type { Member } from "@/lib/types";

const STORAGE_KEY = "aparte:memberId";

/**
 * v0 n'a pas d'authentification : chaque personne choisit son profil une
 * fois sur son appareil, mémorisé en localStorage.
 */
export function useMember() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberId, setMemberIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const storedId = localStorage.getItem(STORAGE_KEY);
      const res = await fetch("/api/members");
      const data = await res.json();
      if (cancelled) return;
      setMemberIdState(storedId);
      setMembers(data.members);
      setLoading(false);
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

  return { members, memberId, currentMember, setMemberId, loading };
}
