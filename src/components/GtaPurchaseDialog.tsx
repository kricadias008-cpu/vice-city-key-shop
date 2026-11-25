import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, KeyRound, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatBRL, rememberCode, type CatalogGame, type GameOrder } from "../lib/catalog";
import { activateKey, purchaseGame } from "../lib/keys.functions";

export type DialogMode = "purchase" | "redeem";

interface GtaPurchaseDialogProps {
  game: CatalogGame | null;
  initialMode: DialogMode;
  onClose: () => void;
}

export function GtaPurchaseDialog({ game, initialMode, onClose }: GtaPurchaseDialogProps) {
  const queryClient = useQueryClient();
  const runPurchase = useServerFn(purchaseGame);
  const runActivate = useServerFn(activateKey);

  const [mode, setMode] = useState<DialogMode>(initialMode);
  const [email, setEmail] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<GameOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setEmail("");
    setCodeInput("");
    setError(null);
    setCompletedOrder(null);
    setSubmitting(false);
    setCopied(false);
  }, [game, initialMode]);

  if (!game) return null;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Informe um e-mail válido ou deixe o campo em branco.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await runPurchase({
        data: trimmedEmail ? { gameId: game.id, buyerEmail: trimmedEmail } : { gameId: game.id },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      rememberCode(res.order.activationCode);
      setCompletedOrder(res.order);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(`${game.title} adquirido! Chave reservada no cofre.`);
    } catch {
      setError("Erro ao processar a compra. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await runActivate({
        data: { code: codeInput, expectedGameId: game.id },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      rememberCode(res.order.activationCode);
      setCompletedOrder(res.order);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(`Chave de ${game.title} ativada!`);
    } catch {
      setError("Erro ao validar a chave. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateNow = async () => {
    if (!completedOrder || completedOrder.status === "activated") return;
    setSubmitting(true);
    try {
      const res = await runActivate({
        data: { code: completedOrder.activationCode, expectedGameId: game.id },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCompletedOrder(res.order);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(`${game.title} ativado com sucesso!`);
    } catch {
      toast.error("Erro ao ativar a chave.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  return (
    <Dialog.Root open={Boolean(game)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold tracking-tight">{game.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Chave {game.platform} • Entrega digital imediata
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {completedOrder ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-primary/40 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {completedOrder.status === "activated" ? "Chave ativada — jogo desbloqueado" : "Chave liberada"}
                  </p>
                  {completedOrder.status === "activated" && (
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <code className="font-mono text-base font-semibold tracking-wider text-foreground">
                    {completedOrder.activationCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(completedOrder.activationCode)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              {completedOrder.status !== "activated" && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleActivateNow}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/25 disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {submitting ? "Ativando..." : "Ativar chave agora"}
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                {completedOrder.status === "activated"
                  ? "Esta chave foi validada e marcada como usada no servidor. Ninguém mais pode reutilizá-la."
                  : "Esta chave foi reservada para você. Ative agora ou depois em Meus pedidos."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/pedidos"
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Ver em Meus pedidos
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-background p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "purchase"}
                  onClick={() => {
                    setMode("purchase");
                    setError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "purchase"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Comprar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "redeem"}
                  onClick={() => {
                    setMode("redeem");
                    setError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "redeem"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  Código
                </button>
              </div>

              {mode === "purchase" ? (
                <form onSubmit={handlePurchase} className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-4 py-3">
                    <div>
                      <span className="block text-sm text-muted-foreground">Total</span>
                      <span className="text-xs text-primary">
                        {game.availableCount === 1
                          ? "1 chave em estoque"
                          : `${game.availableCount} chaves em estoque`}
                      </span>
                    </div>
                    <span className="font-mono text-lg font-semibold text-foreground">
                      {formatBRL(game.priceCents)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="buyer-email" className="text-sm font-medium text-foreground">
                      E-mail para recibo (opcional)
                    </label>
                    <input
                      id="buyer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || game.availableCount === 0}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Reservando chave..." : "Confirmar compra e receber código"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRedeem} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="activation-code" className="text-sm font-medium text-foreground">
                      Código de ativação do {game.title}
                    </label>
                    <input
                      id="activation-code"
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder={`${game.codePrefix}-XXXX-XXXX-XXXX`}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      A chave é validada no estoque real e só pode ser ativada uma vez.
                    </p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting ? "Validando chave..." : "Validar e ativar chave"}
                  </button>
                </form>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}