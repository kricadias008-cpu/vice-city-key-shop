import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatBRL, loadSavedCodes, rememberCode, type GameOrder } from "../lib/catalog";
import { activateKey, lookupMyKeys } from "../lib/keys.functions";

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
  const queryClient = useQueryClient();
  const runLookup = useServerFn(lookupMyKeys);
  const runActivate = useServerFn(activateKey);

  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [quickCode, setQuickCode] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);

  const refreshOrders = useCallback(async () => {
    const codes = loadSavedCodes();
    if (codes.length === 0) {
      setOrders([]);
      setLoaded(true);
      return;
    }
    try {
      const rows = await runLookup({ data: { codes } });
      setOrders(rows);
    } finally {
      setLoaded(true);
    }
  }, [runLookup]);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const handleCopy = async (order: GameOrder) => {
    try {
      await navigator.clipboard.writeText(order.activationCode);
      setCopiedId(order.keyId);
      toast.success("Código copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  const handleActivateOrder = async (order: GameOrder) => {
    setActivatingId(order.keyId);
    try {
      const res = await runActivate({ data: { code: order.activationCode } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await refreshOrders();
      toast.success(`${order.gameTitle} ativado com sucesso!`);
    } catch {
      toast.error("Não foi possível ativar a chave.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleQuickActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    setQuickLoading(true);
    try {
      const res = await runActivate({ data: { code: quickCode } });
      if (!res.ok) {
        setQuickError(res.error);
        return;
      }
      rememberCode(res.order.activationCode);
      setQuickCode("");
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await refreshOrders();
      toast.success(`${res.order.gameTitle} ativado e adicionado aos seus pedidos!`);
    } catch {
      setQuickError("Erro ao validar a chave.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Meus pedidos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Status real das suas chaves compradas e ativadas no cofre da KeyVault.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          Voltar para a vitrine
        </Link>
      </div>

      <form onSubmit={handleQuickActivate} className="mt-8 rounded-xl border border-border bg-card p-5">
        <label htmlFor="quick-key" className="text-sm font-medium text-foreground">
          Ativar uma chave
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="quick-key"
            type="text"
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value)}
            placeholder="Ex.: GTA6-VICE-2026-K9M4"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={quickLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {quickLoading ? "Validando..." : "Ativar chave"}
          </button>
        </div>
        {quickError && <p className="mt-2 text-sm text-destructive">{quickError}</p>}
      </form>

      {loaded && orders.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Nenhum pedido ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compre um jogo na vitrine ou ative uma chave acima para vê-la aqui.
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
          {orders.map((order) => {
            const isActivated = order.status === "activated";
            const timestamp = order.activatedAt ?? order.purchasedAt;
            return (
              <article
                key={order.keyId}
                className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-foreground">{order.gameTitle}</h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                        isActivated
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isActivated && <ShieldCheck className="h-3.5 w-3.5" />}
                      {isActivated ? "Ativado" : "Aguardando ativação"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chave {order.platform}
                    {timestamp
                      ? ` • ${new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(timestamp))}`
                      : ""}
                    {order.purchasedAt ? ` • ${formatBRL(order.priceCents)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-2">
                    <code className="font-mono text-sm font-semibold tracking-wider text-foreground">
                      {order.activationCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(order)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                    >
                      {copiedId === order.keyId ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === order.keyId ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  {!isActivated && (
                    <button
                      type="button"
                      disabled={activatingId === order.keyId}
                      onClick={() => handleActivateOrder(order)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {activatingId === order.keyId ? "Ativando..." : "Ativar"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}