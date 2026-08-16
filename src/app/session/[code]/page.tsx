"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProfileGate } from "@/components/ProfileGate";
import { RankingBoard } from "@/components/RankingBoard";
import { ResultReveal } from "@/components/ResultReveal";
import type { SessionStateDTO } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

async function fetchSession(code: string): Promise<SessionStateDTO | null> {
  const res = await fetch(`/api/sessions/${code}`);
  if (!res.ok) return null;
  return res.json();
}

export default function SessionPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [session, setSession] = useState<SessionStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const data = await fetchSession(code);
      if (cancelled) return;
      if (!data) {
        setError("Session introuvable.");
      } else {
        setSession(data);
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code]);

  if (error) {
    return <p className="p-6 text-center text-stone-500">{error}</p>;
  }
  if (!session) {
    return <p className="p-6 text-center text-stone-500">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <ProfileGate>
        {(memberId, currentName) => {
          const hasSubmitted = session.submittedMemberIds.includes(memberId);
          const others = session.members.filter((m) => m.id !== memberId);
          const waitingOn = others.filter(
            (m) => !session.submittedMemberIds.includes(m.id)
          );

          async function submitRanking(order: string[]) {
            setSubmitting(true);
            try {
              const res = await fetch(`/api/sessions/${code}/rank`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, order }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data.error ?? "Erreur lors de l'envoi du classement.");
                return;
              }
              const data = await fetchSession(code);
              if (data) setSession(data);
            } finally {
              setSubmitting(false);
            }
          }

          if (session.status === "REVEALED" && session.result) {
            return (
              <ResultReveal
                movies={session.movies}
                winnerMovieId={session.result.winnerMovieId}
                scores={session.result.scores}
              />
            );
          }

          if (hasSubmitted) {
            return (
              <div className="py-16 text-center">
                <p className="text-lg font-medium">
                  Classement envoyé, {currentName} !
                </p>
                <p className="mt-2 text-stone-500">
                  En attente de {waitingOn.map((m) => m.name).join(", ")}…
                </p>
              </div>
            );
          }

          return (
            <>
              <ShareCode code={code} />
              <RankingBoard
                movies={session.movies}
                onSubmit={submitRanking}
                submitting={submitting}
              />
            </>
          );
        }}
      </ProfileGate>
    </div>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mb-4 w-full rounded-lg border border-dashed border-stone-300 bg-white px-4 py-2 text-center text-sm text-stone-500"
    >
      Code de session : <span className="font-mono font-semibold text-stone-900">{code}</span>
      {" — "}
      {copied ? "copié !" : "toucher pour copier"}
    </button>
  );
}
