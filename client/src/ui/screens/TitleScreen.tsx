import React, { useEffect } from "react";
import logoUrl from "../../../media/logo-transparent.png";

export function TitleScreen(props: { onContinue: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        props.onContinue();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="page center" style={{ minHeight: "100dvh", height: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div className="scale-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 1.5rem" }}>
        <img
          src={logoUrl}
          alt="TeaDraw"
          style={{
            width: "min(620px, 88vw)",
            maxHeight: "42vh",
            objectFit: "contain",
            marginBottom: "clamp(1.25rem, 3vh, 2rem)",
            filter: "brightness(1.18) contrast(1.08) drop-shadow(0 0 45px rgba(168, 85, 247, 0.65)) drop-shadow(0 0 15px rgba(255, 255, 255, 0.35))"
          }}
        />
        <button
          className="btn primary"
          style={{
            padding: "clamp(12px, 1.8vh, 16px) clamp(40px, 6vw, 68px)",
            fontSize: "clamp(1.1rem, 2.2vh, 1.35rem)",
            fontWeight: 800,
            borderRadius: "50px",
            alignSelf: "center",
            letterSpacing: "0.04em",
            boxShadow: "0 8px 30px rgba(139, 92, 246, 0.55)"
          }}
          onClick={props.onContinue}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
