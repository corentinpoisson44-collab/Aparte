"use client";

import { useEffect, useState } from "react";

/**
 * Page de retour du flow d'auth Plex : `buildAuthUrl` passe cette URL en
 * `forwardUrl`, donc Plex y redirige l'onglet une fois le compte lié.
 * L'onglet Aparté d'origine détecte déjà la liaison en sondant
 * `/api/plex/pin/[id]` — ici on referme juste cet onglet-là pour éviter
 * que la personne doive le faire elle-même.
 */
export default function PlexCallbackPage() {
  const [canAutoClose, setCanAutoClose] = useState(true);

  useEffect(() => {
    window.close();
    // Si la fenêtre est toujours là après coup, c'est que le navigateur a
    // refusé la fermeture (onglet ouvert manuellement, pas de window.opener).
    const timer = setTimeout(() => setCanAutoClose(false), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-6 text-center text-ink">
      <p className="text-sm text-ink/60">
        {canAutoClose
          ? "Compte Plex connecté — fermeture de cet onglet…"
          : "Compte Plex connecté ! Tu peux fermer cet onglet et revenir sur Aparté."}
      </p>
    </main>
  );
}
