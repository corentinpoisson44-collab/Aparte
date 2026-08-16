"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ProfileGate } from "@/components/ProfileGate";
import { RankingBoard } from "@/components/RankingBoard";
import { ResultReveal } from "@/components/ResultReveal";
import type { Member, SessionStateDTO } from "@/lib/types";

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
        setError("On ne trouve pas cette session — vérifie le code.");
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
    return <p className="animate-fade-in p-6 text-center text-ink/50">{error}</p>;
  }
  if (!session) {
    return <p className="animate-fade-in p-6 text-center text-ink/50">Un instant…</p>;
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
                alert(data.error ?? "Ton classement n'a pas pu être envoyé, réessaie.");
                return;
              }
              const data = await fetchSession(code);
              if (data) setSession(data);
            } catch {
              alert("Petit souci de connexion — réessaie.");
            } finally {
              setSubmitting(false);
            }
          }

          // Outil de test local : simule le classement (aléatoire) d'un
          // autre membre du foyer, pour tester le flux de révélation sans
          // avoir besoin d'un second appareil.
          const simulateOtherMember = async (otherId: string) => {
            const shuffled = [...session.movies.map((m) => m.id)].sort(
              () => Math.random() - 0.5
            );
            try {
              const res = await fetch(`/api/sessions/${code}/rank`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: otherId, order: shuffled }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(
                  data.error ?? "Erreur lors de la simulation du partenaire."
                );
                return;
              }
              const data = await fetchSession(code);
              if (data) setSession(data);
            } catch {
              alert("Erreur réseau pendant la simulation.");
            }
          };

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
              <div className="animate-fade-in-up py-16 text-center">
                <p className="font-display text-xl">
                  C&apos;est noté, {currentName} !
                </p>
                <p className="mt-2 text-ink/50">
                  On attend {waitingOn.map((m) => m.name).join(", ")}, plus
                  que ça…
                </p>
                {waitingOn.length > 0 && (
                  <TestSimulatePartner
                    others={waitingOn}
                    onSimulate={simulateOtherMember}
                  />
                )}
              </div>
            );
          }

          return (
            <div className="animate-fade-in-up">
              <ShareCode code={code} />
              <RankingBoard
                movies={session.movies}
                onSubmit={submitRanking}
                submitting={submitting}
              />
              {waitingOn.length > 0 && (
                <TestSimulatePartner
                  others={waitingOn}
                  onSimulate={simulateOtherMember}
                />
              )}
            </div>
          );
        }}
      </ProfileGate>
    </div>
  );
}

// Outil de test : simule le classement du·des autre·s membre·s du foyer
// pour tester le flux à un seul appareil (y compris sur un déploiement).
function TestSimulatePartner({
  others,
  onSimulate,
}: {
  others: Member[];
  onSimulate: (memberId: string) => void;
}) {
  return (
    <div className="mt-6 rounded-sm border border-dashed border-accent/50 bg-accent/5 p-3 text-sm">
      <p className="mb-2 text-accent-dim">Outil de test — simuler un choix :</p>
      <div className="flex flex-wrap gap-2">
        {others.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSimulate(m.id)}
            className="rounded-sm border border-accent/40 bg-paper px-3 py-1.5 text-accent-dim"
          >
            🧪 Simuler « {m.name} »
          </button>
        ))}
      </div>
    </div>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [sessionUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.href : ""
  );

  return (
    <div className="mb-4 border border-dashed border-ink/25 bg-paper p-2">
      <div className="flex items-stretch gap-2">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex-1 px-3 py-2 text-center text-sm text-ink/50 transition-transform active:scale-[0.99]"
        >
          Code à partager :{" "}
          <span className="font-display text-lg tracking-[0.2em] text-ink">
            {code}
          </span>
          {" — "}
          <span className={copied ? "animate-fade-in text-accent" : ""}>
            {copied ? "copié !" : "toucher pour copier"}
          </span>
        </button>
        <button
          onClick={() => setShowQr((v) => !v)}
          aria-label="Afficher le QR code de partage"
          aria-expanded={showQr}
          className="shrink-0 rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink/50 transition-all duration-150 active:scale-95 active:bg-ink/5"
        >
          📱 QR code
        </button>
      </div>
      {showQr && (
        <div className="flex animate-fade-in-up flex-col items-center gap-2 border-t border-dashed border-ink/15 p-4">
          <p className="text-center text-sm text-ink/50">
            Fais scanner ce code à ton/ta partenaire pour qu&apos;iel te
            rejoigne
          </p>
          {sessionUrl && (
            <div className="border border-ink/15 bg-paper p-3">
              <QRCodeSVG value={sessionUrl} size={176} level="M" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
