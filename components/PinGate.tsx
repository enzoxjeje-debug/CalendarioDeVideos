"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import { useCalendar } from "./CalendarProvider";
import { IconArrowRight, IconX } from "./icons";

export default function PinGate({ onClose }: { onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const { unlockUser2, users } = useCalendar();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        gsap.from(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.out" });
        gsap.from(cardRef.current, {
          y: 24,
          opacity: 0,
          scale: 0.97,
          duration: 0.5,
          ease: "expo.out",
        });
      });
      return () => mm.revert();
    },
    { scope: cardRef },
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function shake() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPin("");
    const card = cardRef.current;
    if (!card) return;
    gsap.fromTo(
      card,
      { x: -9 },
      { x: 0, duration: 0.45, ease: "elastic.out(1, 0.35)" },
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (checking || pin.length < 4) {
      setMessage("El PIN tiene 4 digitos");
      shake();
      return;
    }
    setChecking(true);
    setMessage(null);
    const failure = await unlockUser2(pin);
    setChecking(false);
    if (!failure) {
      onClose();
      return;
    }
    setMessage(failure);
    shake();
  }

  return (
    <>
      <div ref={overlayRef} className="overlay z-[70]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[71] flex items-center justify-center px-4">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Entrar como ${users.user2}`}
          className="glass w-full max-w-sm rounded-[1.5rem] p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.62rem] font-semibold tracking-[0.18em] text-success-400 uppercase">
                Acceso privado
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Entrar como {users.user2}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-300 transition-colors hover:text-white"
            >
              <IconX size={15} />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Este usuario entra con un PIN numerico. Solo lo conoce {users.user2}.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <label className="label" htmlFor="user2-pin">
              PIN numerico
            </label>
            <input
              id="user2-pin"
              ref={inputRef}
              className="input text-center font-mono text-2xl tracking-[0.55em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              aria-describedby={message ? "user2-pin-error" : undefined}
            />

            {message ? (
              <p
                id="user2-pin-error"
                role="alert"
                className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400"
              >
                {message}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={checking}>
              {checking ? "Comprobando…" : "Entrar"}
              {checking ? null : <IconArrowRight size={15} />}
            </button>
          </form>

          <p className="mt-4 text-[0.68rem] leading-relaxed text-ink-500">
            Si no conoces el PIN puedes seguir como {users.user1}: el calendario y los videos se
            ven igual.
          </p>
        </div>
      </div>
    </>
  );
}
