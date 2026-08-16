"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileGate } from "@/components/ProfileGate";
import { PlexConnect } from "@/components/PlexConnect";
import { SourceSelector } from "@/components/SourceSelector";

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
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 font-display text-4xl leading-none">
        Un film,<br />à deux.
      </h1>
      <p className="mb-10 text-ink/60">
        Choisissez un film à deux, sans y passer 30 minutes — et en
        s&apos;encourageant à sortir de sa zone de confort.
      </p>

      <ProfileGate>
        {() => (
          <div className="flex flex-col gap-8">
            <div>
              <button
                onClick={createSession}
                disabled={creating}
                className="w-full rounded-sm bg-ink px-4 py-3 font-medium text-paper transition-colors hover:bg-accent disabled:opacity-50"
              >
                {creating ? "Création…" : "Créer une session"}
              </button>
              {error && <p className="mt-2 text-sm text-accent">{error}</p>}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
                Ou rejoindre avec un code
              </label>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinSession()}
                  placeholder="ABCDE"
                  className="w-full rounded-sm border border-ink/25 bg-paper px-4 py-3 font-display text-lg uppercase tracking-[0.3em] placeholder:text-ink/30 focus:border-ink focus:outline-none"
                  maxLength={8}
                />
                <button
                  onClick={joinSession}
                  className="shrink-0 rounded-sm border border-ink px-4 py-3 font-medium hover:bg-ink hover:text-paper"
                >
                  Rejoindre
                </button>
              </div>
            </div>

            <PlexConnect />
            <SourceSelector />
          </div>
        )}
      </ProfileGate>
    </div>
  );
}
