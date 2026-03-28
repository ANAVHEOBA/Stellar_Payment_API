"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { QRCodeSVG } from "qrcode.react";
import "react-loading-skeleton/dist/skeleton.css";
import CheckoutQrModal from "@/components/CheckoutQrModal";
import CopyButton from "@/components/CopyButton";
import WalletSelector from "@/components/WalletSelector";
import { localeToLanguageTag } from "@/i18n/config";
import { usePayment } from "@/lib/usePayment";
import { useWallet } from "@/lib/wallet-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
const EXPLORER_BASE =
  NETWORK === "public"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";

interface PaymentDetails {
  id: string;
  amount: number;
  asset: string;
  asset_issuer: string | null;
  recipient: string;
  description: string | null;
  memo?: string | null;
  memo_type?: string | null;
  status: string;
  tx_id: string | null;
  created_at: string;
  branding_config?: {
    primary_color?: string;
    secondary_color?: string;
    background_color?: string;
  } | null;
}

interface PathQuote {
  source_asset: string;
  source_asset_issuer: string | null;
  source_amount: string;
  send_max: string;
  destination_asset: string;
  destination_amount: string;
  path: Array<{ asset_code: string; asset_issuer: string | null }>;
  slippage: number;
}

const DEFAULT_CHECKOUT_THEME = {
  primary_color: "#5ef2c0",
  secondary_color: "#b8ffe2",
  background_color: "#050608",
};

function AssetBadge({ asset }: { asset: string }) {
  const normalizedAsset = asset.toUpperCase();

  if (normalizedAsset === "XLM" || normalizedAsset === "NATIVE") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/15 via-mint/20 to-mint/40 text-mint shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            d="M14.5 3.5 9 9l4.5.5L13 14l5.5-5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M6 18c3.5-1 6-3.5 7-7" strokeLinecap="round" />
          <path d="M7.5 16.5 4.5 19.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (normalizedAsset === "USDC") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2775CA] text-[10px] font-bold tracking-[0.18em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        USDC
      </span>
    );
  }

  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white">
      {asset.slice(0, 3)}
    </span>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const statusMap: Record<string, { label: string; classes: string }> = {
    pending: {
      label: t("status.pending"),
      classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    },
    confirmed: {
      label: t("status.confirmed"),
      classes: "bg-mint/10 text-mint border border-mint/30",
    },
    completed: {
      label: t("status.completed"),
      classes: "bg-green-500/15 text-green-400 border border-green-500/30",
    },
    failed: {
      label: t("status.failed"),
      classes: "bg-red-500/15 text-red-400 border border-red-500/30",
    },
  };

  const resolvedStatus = statusMap[status.toLowerCase()] ?? {
    label: status,
    classes: "bg-white/10 text-slate-400 border border-white/10",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${resolvedStatus.classes}`}
    >
      {resolvedStatus.label}
    </span>
  );
}

function buildSep7Uri(payment: PaymentDetails) {
  const params = new URLSearchParams({
    destination: payment.recipient,
    amount: String(payment.amount),
    asset_code: payment.asset.toUpperCase(),
  });

  if (payment.asset_issuer) {
    params.set("asset_issuer", payment.asset_issuer);
  }
  if (payment.memo) {
    params.set("memo", payment.memo);
  }
  if (payment.memo_type) {
    params.set("memo_type", payment.memo_type);
  }

  return `web+stellar:pay?${params.toString()}`;
}

function LoadingSkeleton() {
  return (
    <SkeletonTheme baseColor="#151d2e" highlightColor="#1f2d44">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <Skeleton width={96} height={12} borderRadius={999} />
          <Skeleton width={220} height={36} borderRadius={10} />
          <Skeleton width={280} height={10} borderRadius={999} />
        </header>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center gap-3 border-b border-white/10 px-8 py-10">
            <Skeleton circle width={40} height={40} />
            <Skeleton width={200} height={52} borderRadius={10} />
            <Skeleton width={140} height={14} borderRadius={999} />
            <Skeleton width={120} height={26} borderRadius={999} />
          </div>

          <div className="flex flex-col gap-5 p-8">
            <div className="flex flex-col gap-1.5">
              <Skeleton width={72} height={10} borderRadius={999} />
              <Skeleton height={46} borderRadius={12} />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton width={56} height={10} borderRadius={999} />
              <Skeleton width={160} height={16} borderRadius={6} />
            </div>
            <Skeleton height={48} borderRadius={12} className="mt-2" />
          </div>
        </div>
      </main>
    </SkeletonTheme>
  );
}

export default function PaymentPage() {
  const t = useTranslations("checkout");
  const locale = localeToLanguageTag(useLocale());
  const params = useParams();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRawIntent, setShowRawIntent] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [usePathPayment, setUsePathPayment] = useState(false);
  const [pathQuote, setPathQuote] = useState<PathQuote | null>(null);
  const [pathQuoteLoading, setPathQuoteLoading] = useState(false);
  const [pathQuoteError, setPathQuoteError] = useState<string | null>(null);

  const { activeProvider } = useWallet();
  const {
    isProcessing,
    status: txStatus,
    error: paymentError,
    processPayment,
    processPathPayment,
  } = usePayment(activeProvider);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payment-status/${paymentId}`, {
          signal: controller.signal,
        });

        if (res.status === 404) {
          throw new Error(t("paymentMissing"));
        }
        if (!res.ok) {
          throw new Error(t("loadFailed"));
        }

        const data = await res.json();
        setPayment(data.payment);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setFetchError(
          err instanceof Error ? err.message : t("loadPaymentFailed"),
        );
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [paymentId, t]);

  useEffect(() => {
    if (loading || !payment) return;

    const settled = ["confirmed", "completed", "failed"].includes(
      payment.status,
    );
    if (settled) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/payment-status/${paymentId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.payment) {
          setPayment(data.payment);
        }
      } catch {
        return;
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [loading, payment, paymentId]);

  useEffect(() => {
    if (!payment || !activeProvider || payment.status !== "pending") return;

    if (
      payment.asset.toUpperCase() === "XLM" ||
      payment.asset.toUpperCase() === "NATIVE"
    ) {
      setPathQuote(null);
      setUsePathPayment(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setPathQuoteLoading(true);
      setPathQuoteError(null);

      try {
        const publicKey = await activeProvider.getPublicKey();
        const qs = new URLSearchParams({
          source_asset: "XLM",
          source_asset_issuer: "",
          source_account: publicKey,
        });
        const res = await fetch(
          `${API_URL}/api/path-payment-quote/${paymentId}?${qs}`,
        );

        if (!res.ok) {
          if (!cancelled) {
            setPathQuote(null);
            setUsePathPayment(false);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setPathQuote(data);
          setUsePathPayment(true);
        }
      } catch {
        if (!cancelled) {
          setPathQuoteError(t("quoteUnavailable"));
        }
      } finally {
        if (!cancelled) {
          setPathQuoteLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProvider, payment, paymentId, t]);

  const handlePay = async () => {
    if (!payment) return;

    setActionError(null);

    try {
      let result: { hash: string };

      if (usePathPayment && pathQuote) {
        result = await processPathPayment({
          recipient: payment.recipient,
          destAmount: pathQuote.destination_amount,
          destAssetCode: pathQuote.destination_asset,
          destAssetIssuer: payment.asset_issuer,
          sendMax: pathQuote.send_max,
          sendAssetCode: pathQuote.source_asset,
          sendAssetIssuer: pathQuote.source_asset_issuer,
          path: pathQuote.path,
        });
      } else {
        result = await processPayment({
          recipient: payment.recipient,
          amount: String(payment.amount),
          assetCode: payment.asset,
          assetIssuer: payment.asset_issuer,
        });
      }

      setPayment({ ...payment, status: "completed", tx_id: result.hash });
      toast.success(t("paymentSent"));

      setTimeout(async () => {
        try {
          await fetch(`${API_URL}/api/verify-payment/${paymentId}`, {
            method: "POST",
          });
        } catch {
          return;
        }
      }, 2000);
    } catch {
      const message = paymentError ?? t("paymentFailed");
      setActionError(message);
      toast.error(message);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (fetchError || !payment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-red-400">
            {t("errorTitle")}
          </p>
          <h1 className="mt-3 text-lg font-semibold text-white">
            {fetchError ?? t("paymentNotFound")}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{t("errorDescription")}</p>
        </div>
      </main>
    );
  }

  const isSettled =
    payment.status === "confirmed" || payment.status === "completed";
  const isFailed = payment.status === "failed";
  const paymentIntentUri = buildSep7Uri(payment);
  const checkoutTheme = {
    ...DEFAULT_CHECKOUT_THEME,
    ...(payment.branding_config || {}),
  };

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 backdrop-blur-sm">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/15 border-t-mint" />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-base font-semibold text-white">
              {txStatus ?? t("processingFallback")}
            </p>
            <p className="text-sm text-slate-400">{t("doNotClose")}</p>
          </div>
        </div>
      )}

      <main
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16"
        style={
          {
            "--checkout-primary": checkoutTheme.primary_color,
            "--checkout-secondary": checkoutTheme.secondary_color,
            "--checkout-bg": checkoutTheme.background_color,
            background:
              "radial-gradient(1200px circle at 10% -10%, color-mix(in srgb, var(--checkout-primary) 18%, #15233b) 0%, var(--checkout-bg) 45%, #050608 100%)",
          } as CSSProperties
        }
      >
        <header className="flex flex-col gap-2">
          <p
            className="font-mono text-xs uppercase tracking-[0.3em]"
            style={{ color: "var(--checkout-primary)" }}
          >
            {t("paymentRequest")}
          </p>
          <h1 className="text-3xl font-bold text-white">
            {t("completePayment")}
          </h1>
          <p className="break-all font-mono text-xs text-slate-500">
            ID: {payment.id}
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center gap-3 border-b border-white/10 px-8 py-10">
            <AssetBadge asset={payment.asset} />
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight text-white">
                {payment.amount.toLocaleString(locale, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 7,
                })}
              </span>
              <span
                className="text-2xl font-semibold"
                style={{ color: "var(--checkout-secondary)" }}
              >
                {payment.asset.toUpperCase()}
              </span>
            </div>
            {payment.description && (
              <p className="mt-1 text-sm text-slate-400">
                {payment.description}
              </p>
            )}
            <StatusBadge status={payment.status} t={t} />
          </div>

          <div className="flex flex-col gap-5 p-8">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("recipient")}
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                <code className="flex-1 truncate font-mono text-sm text-slate-200">
                  {payment.recipient}
                </code>
                <CopyButton text={payment.recipient} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("scanToPay")}
              </p>
              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white p-4">
                <QRCodeSVG
                  value={paymentIntentUri}
                  size={160}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-center text-xs text-slate-500">
                {t("scanDescription")}
              </p>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center justify-center gap-2 self-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm12 3v3m0 0h3m-3 0h-3m3-6v-3m0 3h3m-9 6h6v-6h-6z"
                  />
                </svg>
                {t("openQrModal")}
              </button>

              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowRawIntent((previous) => !previous)}
                  className="mx-auto mt-2 text-xs font-medium text-mint transition-colors hover:text-glow"
                >
                  {showRawIntent ? t("hideRawIntent") : t("viewRawIntent")}
                </button>
                {showRawIntent && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
                    <code className="flex-1 break-all font-mono text-[11px] text-slate-200">
                      {paymentIntentUri}
                    </code>
                    <CopyButton text={paymentIntentUri} className="mt-0.5" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("created")}
              </p>
              <p className="text-sm text-slate-300">
                {new Date(payment.created_at).toLocaleString(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            {payment.tx_id && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {t("transaction")}
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                  <a
                    href={`${EXPLORER_BASE}/tx/${payment.tx_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate font-mono text-sm text-mint underline underline-offset-2 hover:text-glow"
                  >
                    {payment.tx_id}
                  </a>
                  <CopyButton text={payment.tx_id} />
                </div>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
              >
                {actionError}
              </div>
            )}

            {!isSettled && !isFailed && (
              <div className="flex flex-col gap-3 pt-2">
                {activeProvider ? (
                  <>
                    <p className="text-center text-xs text-slate-500">
                      {t("connectedVia", { provider: activeProvider.name })}
                    </p>

                    {pathQuote && !pathQuoteLoading && (
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={() => setUsePathPayment(false)}
                          className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                            !usePathPayment
                              ? "border-mint/50 bg-mint/10"
                              : "border-white/10 bg-black/30 hover:bg-white/5"
                          }`}
                        >
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                            {t("standardAssetOption", {
                              asset: payment.asset.toUpperCase(),
                            })}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {payment.amount} {payment.asset.toUpperCase()}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUsePathPayment(true)}
                          className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                            usePathPayment
                              ? "border-mint/50 bg-mint/10"
                              : "border-white/10 bg-black/30 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                                {t("pathPaymentOption")}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">
                                {pathQuote.source_amount}{" "}
                                {pathQuote.source_asset}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {t("approximateCost")}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-mint">
                              XLM
                            </span>
                          </div>
                          <p className="mt-4 text-sm text-slate-300">
                            {t("merchantReceives", {
                              amount: pathQuote.destination_amount,
                              asset: pathQuote.destination_asset,
                            })}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t("quoteBuffer", { amount: pathQuote.send_max })}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {t("pathPaymentHint")}
                          </p>
                        </button>
                      </div>
                    )}

                    {pathQuoteLoading && (
                      <p className="text-center text-xs text-slate-500">
                        {t("quoteLoading")}
                      </p>
                    )}

                    {pathQuoteError && (
                      <p className="text-center text-xs text-red-400">
                        {pathQuoteError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={isProcessing}
                      className="group relative flex h-12 w-full items-center justify-center rounded-xl font-bold text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: "var(--checkout-primary)" }}
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          {t("processing")}
                        </span>
                      ) : usePathPayment && pathQuote ? (
                        t("payInXlm")
                      ) : activeProvider.name ? (
                        t("payWith", { provider: activeProvider.name })
                      ) : (
                        t("payWithFallback")
                      )}
                      <div
                        className="absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity group-hover:opacity-100"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--checkout-primary) 20%, transparent)",
                        }}
                      />
                    </button>
                  </>
                ) : (
                  <WalletSelector
                    networkPassphrase={
                      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
                      "Test SDF Network ; September 2015"
                    }
                    onConnected={() => undefined}
                  />
                )}
              </div>
            )}

            {isSettled && (
              <div
                className="rounded-xl border p-4 text-center"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--checkout-primary) 30%, transparent)",
                  backgroundColor:
                    "color-mix(in srgb, var(--checkout-primary) 7%, transparent)",
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--checkout-primary)" }}
                >
                  {t("receivedTitle")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("receivedDescription")}
                </p>
              </div>
            )}

            {isFailed && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                <p className="text-sm font-semibold text-red-400">
                  {t("failedTitle")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("failedDescription")}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <CheckoutQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        qrValue={paymentIntentUri}
        paymentId={payment.id}
      />
    </>
  );
}
