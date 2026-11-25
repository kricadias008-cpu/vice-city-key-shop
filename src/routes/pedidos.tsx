import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatBRL, loadOrders, type GameOrder } from "../lib/catalog";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — KeyVault" },
      { name: "description", content: "Consulte suas compras e códigos de ativação na KeyVault." },
      { property: "og:title", content: "Meus pedidos — KeyVault" },
      { property: "og:description", content: "Consulte suas compras e códigos de ativação na KeyVault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedidosPage,
});

function PedidosPage() {
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(loadOrders());
    setLoaded(true);
  }, []);

  const handleCopy = async (order: GameOrder) => {
    try {
      await navigator.clipboard.writeText(order.activationCode);
      setCopiedId(order.id);
      toast.success("Código copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Meus pedidos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Suas chaves compradas e códigos resgatados neste navegador.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          Voltar para a vitrine
        </Link>
      </div>

      {loaded && orders.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Nenhum pedido ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compre o GTA 6 ou resgate um código na vitrine para vê-lo aqui.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para a vitrine
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-foreground">{order.gameTitle}</h2>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-primary">
                    {order.type === "purchase" ? "Compra" : "Código resgatado"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chave {order.platform} •{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}
                  {order.type === "purchase" ? ` • ${formatBRL(order.priceCents)}` : ""}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2 sm:justify-end">
                <code className="font-mono text-sm font-semibold tracking-wider text-foreground">
                  {order.activationCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(order)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                >
                  {copiedId === order.id ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedId === order.id ? "Copiado" : "Copiar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}