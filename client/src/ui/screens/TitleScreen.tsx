import logoUrl from "../../../media/logo-transparent.png";

export function TitleScreen(props: { onContinue: () => void }) {
  return (
    <div className="page center" style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div className="scale-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <img
          src={logoUrl}
          alt="TeaDraw"
          style={{
            width: "min(700px, 90vw)",
            marginBottom: "4rem",
            filter: "drop-shadow(0 0 40px rgba(255, 255, 255, 0.5))"
          }}
        />
        <button
          className="btn primary"
          style={{ padding: "1.2rem 4rem", fontSize: "1.3rem", borderRadius: "50px", alignSelf: "center" }}
          onClick={props.onContinue}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
