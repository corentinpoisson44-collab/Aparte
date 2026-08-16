"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileGate } from "@/components/ProfileGate";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createSession() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Impossible de créer une session (${res.status}).`);
        return;
      }
      const data = await res.json();
      router.push(`/session/${data.code}`);
    } catch {
      setError("Erreur réseau, réessaie.");
    } finally {
      setCreating(false);
    }
  }

  function joinSession() {
    if (!joinCode.trim()) return;
    router.push(`/session/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Aparté</h1>
      <p className="mb-8 text-stone-500">
        Choisissez un film à deux, sans y passer 30 minutes.
      </p>

      <ProfileGate>
        {() => (
          <div className="flex flex-col gap-8">
            <div>
              <button
                onClick={createSession}
                disabled={creating}
                className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer une session"}
              </button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm text-stone-500">
                Ou rejoindre avec un code
              </label>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinSession()}
                  placeholder="ABCDE"
                  className="w-full rounded-lg border border-stone-300 px-4 py-3 font-mono uppercase tracking-widest"
                  maxLength={8}
                />
                <button
                  onClick={joinSession}
                  className="shrink-0 rounded-lg border border-stone-900 px-4 py-3 font-medium"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          </div>
        )}
      </ProfileGate>
    </div>
  );
}
