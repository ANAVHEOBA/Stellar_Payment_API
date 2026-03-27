"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import CopyButton from "./CopyButton";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  useHydrateMerchantStore,
  useMerchantApiKey,
  useMerchantHydrated,
  useMerchantTrustedAddresses,
} from "@/lib/merchant-store";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Stellar testnet USDC issuer — override via NEXT_PUBLIC_USDC_ISSUER for mainnet
const USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/** Basic Stellar public-key format check (G + 55 base-32 chars = 56 total). */
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const DEFAULT_BRANDING = {
  primary_color: "#5ef2c0",
  secondary_color: "#b8ffe2",
  background_color: "#050608",
};

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

interface CreatedPayment {
  payment_id: string;
  payment_link: string;
  status: string;
}

export default function CreatePaymentForm() {
  const t = useTranslations("createPaymentForm");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<"XLM" | "USDC">("XLM");
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPayment | null>(null);
  const apiKey = useMerchantApiKey();
  const hydrated = useMerchantHydrated();
  const trustedAddresses = useMerchantTrustedAddresses();
  const [useSessionBranding, setUseSessionBranding] = useLocalStorage("payment_use_branding", false);
  const [branding, setBranding] = useLocalStorage("payment_branding", DEFAULT_BRANDING);
  const [selectedTrustedAddress, setSelectedTrustedAddress] = useLocalStorage("payment_trusted_address", "");

  useHydrateMerchantStore();

  // ── Rate-limit countdown ──────────────────────────────────
  const [retryAfter, setRetryAfter] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (retryAfter <= 0) {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      return;
    }

    retryTimerRef.current = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          clearInterval(retryTimerRef.current!);
          retryTimerRef.current = null;
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [retryAfter]);
  // ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    if (!STELLAR_ADDRESS_RE.test(recipient.trim())) {
      setError(t("invalidRecipient"));
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        amount: numAmount,
        asset,
        recipient: recipient.trim(),
      };
      if (asset === "USDC") body.asset_issuer = USDC_ISSUER;
      if (description.trim()) body.description = description.trim();
      if (useSessionBranding) {
        for (const [key, color] of Object.entries(branding)) {
          if (!HEX_COLOR_REGEX.test(color)) {
            setError(t("invalidHexColor", { field: key }));
            setLoading(false);
            return;
          }
        }
        body.branding_overrides = branding;
      }

      const res = await fetch(`${API_URL}/api/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey!,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // ── 429 Rate-limit handling ─────────────────────────────
      if (res.status === 429) {
        const retryHeader = res.headers.get("Retry-After");
        const seconds = retryHeader ? Math.max(1, Math.ceil(Number(retryHeader))) : 60;
        setRetryAfter(seconds);
        const msg = t("rateLimitError", { seconds: String(seconds) });
        setError(msg);
        toast.error(msg);
        return;
      }
      // ────────────────────────────────────────────────────────

      if (!res.ok)
        throw new Error(data.error ?? t("failedCreate"));

      setCreated(data);
      toast.success(t("createdToast"));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("failedCreate");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreated(null);

    setAmount("");
    setRecipient("");
    setDescription("");
    setAsset("XLM");
    setUseSessionBranding(false);
    setBranding(DEFAULT_BRANDING);
    setSelectedTrustedAddress("");

    // 🧹 clear localStorage
    localStorage.removeItem("payment_amount");
    localStorage.removeItem("payment_asset");
    localStorage.removeItem("payment_recipient");
    localStorage.removeItem("payment_description");
    localStorage.removeItem("payment_use_branding");
    localStorage.removeItem("payment_branding");
    localStorage.removeItem("payment_trusted_address");

    setError(null);
    setRetryAfter(0);
  };

  const handleTrustedAddressSelect = (addressId: string) => {
    setSelectedTrustedAddress(addressId);
    if (addressId) {
      const selected = trustedAddresses.find((addr) => addr.id === addressId);
      if (selected) {
        setRecipient(selected.address);
      }
    }
  };

  const updateBrandingField = (
    key: keyof typeof DEFAULT_BRANDING,
    value: string,
  ) => {
    setBranding((current) => ({
      ...current,
      [key]: normalizeHexInput(value),
    }));
  };

  // Avoid hydration mismatch — render nothing until localStorage is read
  if (!hydrated) return null;

  // No API key stored — direct the user to register first
  if (!apiKey) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
        <p className="text-base font-medium text-yellow-200">
          {t("noApiKeyTitle")}
        </p>
        <p className="text-sm text-slate-400">
          {t("noApiKeyDescription")}
        </p>
        <Link
          href="/register"
          className="mt-2 rounded-xl bg-mint px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-glow"
        >
          {t("registerAsMerchant")}
        </Link>
      </div>
    );
  }

  // Success — show the generated payment link
  if (created) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-mint/30 bg-mint/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
              {t("readyEyebrow")}
            </p>
            <h2 className="text-xl font-semibold text-white">
              {t("readyTitle")}
            </h2>
            <p className="text-sm text-slate-400">
              {t("readyDescription")}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <label className="text-xs font-medium text-slate-300">
              {t("paymentLink")}
            </label>
            <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-1 pl-4">
              <code className="flex-1 truncate font-mono text-sm text-mint">
                {created.payment_link}
              </code>
              <CopyButton text={created.payment_link} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">
                {t("paymentId")}
              </p>
              <p className="truncate font-mono text-xs text-slate-300">
                {created.payment_id}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">
                {t("status")}
              </p>
              <p className="font-mono text-xs capitalize text-slate-300">
                {created.status}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-center text-sm font-medium text-slate-400 underline underline-offset-4 transition-colors hover:text-white"
        >
          {t("createAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {error && retryAfter > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{t("rateLimitError", { seconds: String(retryAfter) })}</span>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-yellow-500/20">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all duration-1000 ease-linear"
                style={{ width: "100%" }}
                key={retryAfter}
              />
            </div>
          </div>
        </div>
      )}
      {error && retryAfter <= 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="amount"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            {t("amount")}
          </label>
          <input
            id="amount"
            type="number"
            min="0.0000001"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-slate-600 focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            placeholder="0.00"
          />
        </div>

        {/* Asset */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {t("asset")}
          </span>
          <div className="flex gap-2" role="group" aria-label={t("selectAsset")}>
            {(["XLM", "USDC"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAsset(a)}
                aria-pressed={asset === a}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${asset === a
                    ? "border-mint/50 bg-mint/10 text-mint"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
              >
                {a}
              </button>
            ))}
          </div>
          {asset === "USDC" && (
            <p className="text-[11px] text-slate-500">
              {t("issuer")}:{" "}
              <span className="font-mono">
                {USDC_ISSUER.slice(0, 8)}…{USDC_ISSUER.slice(-6)}
              </span>
            </p>
          )}
        </div>

        {/* Trusted Addresses Dropdown */}
        {trustedAddresses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="trusted-address"
              className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
              {t("trustedAddresses")}
            </label>
            <select
              id="trusted-address"
              value={selectedTrustedAddress}
              onChange={(e) => handleTrustedAddressSelect(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/50"
            >
              <option value="">{t("selectSavedAddress")}</option>
              {trustedAddresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.label} ({addr.address.slice(0, 8)}...{addr.address.slice(-6)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recipient */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="recipient"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            {t("recipientAddress")}
          </label>
          <input
            id="recipient"
            type="text"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-600 focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/50"
            placeholder="GABC…XYZ"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Description (optional) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-xs font-medium uppercase tracking-wider text-slate-400"
          >
            {t("descriptionLabel")}{" "}
            <span className="normal-case text-slate-600">({t("optional")})</span>
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-slate-600 focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/50"
            placeholder="e.g. Invoice #42"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
                {t("brandingTitle")}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {t("brandingDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUseSessionBranding((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${useSessionBranding
                  ? "bg-mint text-black"
                  : "border border-white/20 text-slate-300"
                }`}
            >
              {useSessionBranding ? t("enabled") : t("disabled")}
            </button>
          </div>

          {useSessionBranding && (
            <div className="mt-4 grid gap-3">
              {([
                ["primary_color", t("primary")],
                ["secondary_color", t("secondary")],
                ["background_color", t("background")],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-400">{label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding[field]}
                      onChange={(e) => updateBrandingField(field, e.target.value)}
                      className="h-9 w-14 rounded border border-white/10 bg-transparent p-1"
                    />
                    <input
                      type="text"
                      value={branding[field]}
                      onChange={(e) => updateBrandingField(field, e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-white"
                    />
                  </div>
                </label>
              ))}

              <div
                className="rounded-lg border border-white/10 p-3"
                style={{ background: branding.background_color }}
              >
                <p className="text-xs" style={{ color: branding.secondary_color }}>
                  {t("checkoutPreview")}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-md px-3 py-1.5 text-xs font-semibold"
                  style={{ background: branding.primary_color, color: "#000" }}
                >
                  {t("payNow")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || retryAfter > 0}
        className="group relative flex h-12 items-center justify-center rounded-xl bg-mint px-6 font-bold text-black transition-all hover:bg-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
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
            {t("generating")}
          </span>
        ) : retryAfter > 0 ? (
          t("retryWait", { seconds: String(retryAfter) })
        ) : (
          t("generate")
        )}
        <div className="absolute inset-0 -z-10 bg-mint/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
      </button>
    </form>
  );
}
