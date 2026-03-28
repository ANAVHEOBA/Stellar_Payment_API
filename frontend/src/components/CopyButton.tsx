"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export default function CopyButton({ text, className = "" }: CopyButtonProps) {
  const t = useTranslations("copyButton");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <motion.button
        onClick={handleCopy}
        aria-label={t("ariaLabel")}
        animate={
          copied
            ? {
                x: [0, -2, 2, -3, 3, -1, 0],
                skewX: [0, -8, 8, -6, 3, 0],
                filter: [
                  "drop-shadow(0 0 0 rgba(94,242,192,0))",
                  "drop-shadow(-4px 0 0 rgba(94,242,192,0.9)) drop-shadow(4px 0 0 rgba(255,70,90,0.5))",
                  "drop-shadow(2px 0 0 rgba(94,242,192,0.7)) drop-shadow(-2px 0 0 rgba(93,197,255,0.45))",
                  "drop-shadow(0 0 0 rgba(94,242,192,0))",
                ],
              }
            : {
                x: 0,
                skewX: 0,
                filter: "drop-shadow(0 0 0 rgba(94,242,192,0))",
              }
        }
        transition={
          copied
            ? { duration: 0.45, times: [0, 0.15, 0.3, 1] }
            : { duration: 0.2 }
        }
        className={`relative overflow-hidden rounded-lg border border-white/10 p-1.5 text-slate-400 transition-all hover:border-mint/40 hover:text-mint active:scale-95 ${className}`}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg"
          animate={
            copied
              ? {
                  opacity: [0, 0.9, 0.25, 0],
                  background: [
                    "linear-gradient(90deg, rgba(94,242,192,0) 0%, rgba(94,242,192,0) 100%)",
                    "linear-gradient(90deg, rgba(94,242,192,0) 0%, rgba(94,242,192,0.28) 45%, rgba(255,70,90,0.18) 55%, rgba(94,242,192,0) 100%)",
                    "linear-gradient(90deg, rgba(94,242,192,0) 0%, rgba(93,197,255,0.16) 45%, rgba(94,242,192,0.16) 55%, rgba(94,242,192,0) 100%)",
                    "linear-gradient(90deg, rgba(94,242,192,0) 0%, rgba(94,242,192,0) 100%)",
                  ],
                }
              : {
                  opacity: 0,
                  background:
                    "linear-gradient(90deg, rgba(94,242,192,0) 0%, rgba(94,242,192,0) 100%)",
                }
          }
          transition={
            copied
              ? { duration: 0.45, times: [0, 0.2, 0.5, 1] }
              : { duration: 0.2 }
          }
        />
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.svg
              key="checkmark"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-mint"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                duration: 0.4,
              }}
            >
              <motion.polyline
                points="20 6 9 17 4 12"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  pathLength: { delay: 0.2, duration: 0.3, ease: "easeInOut" },
                }}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="clipboard"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: copied ? 0 : 1, opacity: copied ? 0 : 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-mint/30 bg-tide px-2 py-1 font-mono text-xs text-mint shadow-lg"
          >
            {t("copied")}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? t("copiedState") : ""}
      </span>
    </div>
  );
}
