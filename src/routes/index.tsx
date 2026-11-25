import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { GtaPurchaseDialog, type DialogMode } from "../components/GtaPurchaseDialog";
import { formatBRL, GAMES, type GameItem } from "../lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KeyVault — Seu próximo jogo, na hora" },
      {
        name: "description",
        content: "Chaves de ativação oficiais com entrega digital imediata. GTA 6 disponível para compra e resgate de código.",
      },
      { property: "og:title", content: "KeyVault — Seu próximo jogo, na hora" },
      {
        property: "og:description",
        content: "Chaves de ativação oficiais com entrega digital imediata. GTA 6 disponível para compra e resgate de código.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("purchase");

  const openDialog = (game: GameItem, mode: DialogMode) => {
    setDialogMode(mode);
    setSelectedGame(game);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Seu próximo jogo, <span className="text-primary">na hora.</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Chaves de ativação oficiais com entrega digital imediata.
        </p>
      </section>

      <section aria-label="Catálogo de jogos" className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {GAMES.map((game) => (
          <article
            key={game.id}
            className={`flex flex-col overflow-hidden rounded-xl border bg-card transition-colors ${
              game.inStock ? "border-primary/40" : "border-border"
            }`}
          >
            <div
              className={`flex min-h-40 items-end p-5 ${
                game.featured ? "keyvault-cover-featured" : "keyvault-cover"
              }`}
            >
              <h2 className="text-xl font-bold tracking-tight text-foreground">{game.title}</h2>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{game.description}</p>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-base font-semibold text-foreground">
                    {formatBRL(game.priceCents)}
                  </span>
                  <span className={`text-xs font-medium ${game.inStock ? "text-primary" : "text-destructive"}`}>
                    {game.inStock ? "Disponível" : "Esgotado"}
                  </span>
                </div>

                {game.inStock ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openDialog(game, "purchase")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Comprar
                    </button>
                    <button
                      type="button"
                      onClick={() => openDialog(game, "redeem")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Código
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
                  >
                    Esgotado
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      <GtaPurchaseDialog
        game={selectedGame}
        initialMode={dialogMode}
        onClose={() => setSelectedGame(null)}
      />
    </main>
  );
}
