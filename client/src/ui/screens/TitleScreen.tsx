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
    <div className="page center" style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div className="scale-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 1.5rem" }}>
        <img
          src={logoUrl}
          alt="TeaDraw"
          style={{
            width: "min(620px, 88vw)",
            maxHeight: "42vh",
            objectFit: "contain",
            marginBottom: "clamp(1.25rem, 3vh, 2rem)",
            filter: "drop-shadow(0 0 40px rgba(139, 92, 246, 0.45))"
          }}
        />
        <button
          className="btn primary"
          style={{
            padding: "clamp(12px, 1.8vh, 16px) clamp(36px, 5vw, 60px)",
            fontSize: "clamp(1.05rem, 2vh, 1.3rem)",
            borderRadius: "50px",
            alignSelf: "center"
          }}
          onClick={props.onContinue}
        >
          Play TeaDraw →
        </button>
      </div>
    </div>
  );
}
