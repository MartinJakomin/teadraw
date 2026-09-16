import logoUrl from "../../../media/logo-transparent.png";

export function TitleScreen(props: { onContinue: () => void }) {
  return (
    <div className="page center" style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div className="scale-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <img
          src={logoUrl}
          alt="TeaDraw"
          style={{
            width: "min(640px, 88vw)",
            maxHeight: "45vh",
            objectFit: "contain",
            marginBottom: "clamp(1.5rem, 3.5vh, 2.5rem)",
            filter: "drop-shadow(0 0 40px rgba(255, 255, 255, 0.45))"
          }}
        />
        <button
          className="btn primary"
          style={{
            padding: "clamp(10px, 1.8vh, 16px) clamp(32px, 5vw, 56px)",
            fontSize: "clamp(1.05rem, 2vh, 1.3rem)",
            borderRadius: "50px",
            alignSelf: "center"
          }}
          onClick={props.onContinue}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
