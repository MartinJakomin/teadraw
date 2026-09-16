import React, { useState, useEffect } from "react";
import { SERVER_URL } from "../../net/socket";

import logoUrl from "../../../media/logo-transparent.png";

export function HomeScreen(props: {
  name: string;
  setName: (v: string) => void;
  roomCode: string;
  setRoomCode: (v: string) => void;
  error: string;
  onCreate: () => void;
  onJoin: () => void;
  onPractice: () => void;
}) {
  const [serverVersion, setServerVersion] = useState<string>(
    import.meta.env.VITE_APP_VERSION || ""
  );

  useEffect(() => {
    fetch(`${SERVER_URL}/api/version`)
      .then(async (r) => {
        if (!r.ok) return;
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return;
        const d = await r.json().catch(() => null);
        if (d?.version) setServerVersion(d.version);
      })
      .catch(() => {
        // Silently fail to avoid console noise if server is down or route missing
      });
  }, []);

  return (
    <div className="page center home-page" style={{ minHeight: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: "auto 0" }}>
      <div style={{ maxWidth: "min(920px, 94vw)", width: "100%", textAlign: "center", margin: "auto", padding: "clamp(0.75rem, 2vh, 2rem) clamp(1rem, 2vw, 2rem)" }}>
        <img
          src={logoUrl}
          alt="TeaDraw Logo"
          style={{
            maxWidth: "clamp(320px, 44vw, 480px)",
            width: "100%",
            height: "auto",
            marginBottom: "clamp(0.6rem, 1.4vh, 1.2rem)",
            filter: "drop-shadow(0 8px 30px rgba(99, 102, 241, 0.4))"
          }}
        />

        <div className="card" style={{ marginBottom: "clamp(0.75rem, 1.4vh, 1.2rem)", padding: "clamp(0.85rem, 1.4vh, 1.25rem) clamp(1.2rem, 2vw, 2rem)" }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--primary2)", letterSpacing: "0.04em" }}>First, enter your name:</label>
            <input
              style={{ textAlign: "center", fontSize: "1.3rem", padding: "0.75rem 1.2rem", fontWeight: 800, borderRadius: "14px" }}
              value={props.name}
              onChange={(e) => props.setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={18}
            />
          </div>
        </div>

        <div className="game-tiles" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(0.75rem, 1.4vw, 1.25rem)", margin: "clamp(0.6rem, 1vh, 1rem) 0" }}>
          <div className={`game-tile ${props.name.trim() ? "" : "disabled"}`} style={{ height: "auto", padding: "clamp(1.2rem, 1.8vh, 1.6rem) 1.2rem", gap: "8px" }}>
            <div className="game-tile-icon" style={{ fontSize: "2.8rem" }}>🏠</div>
            <div className="game-tile-name" style={{ fontSize: "1.35rem", fontWeight: 800 }}>Host a Game</div>
            <div className="game-tile-desc" style={{ fontSize: "0.9rem" }}>Create a new private room and invite your friends.</div>
            <button 
              className="btn primary" 
              style={{ width: "100%", marginTop: "0.6rem", padding: "12px 24px", fontWeight: 800, fontSize: "1.05rem", borderRadius: "14px" }} 
              onClick={() => {
                console.log(`Creating room... Version: ${serverVersion}`);
                props.onCreate();
              }} 
              disabled={!props.name.trim()}
            >
              Create Room
            </button>
          </div>

          <div className={`game-tile ${props.name.trim() ? "" : "disabled"}`} style={{ height: "auto", padding: "clamp(1.2rem, 1.8vh, 1.6rem) 1.2rem", gap: "8px" }}>
            <div className="game-tile-icon" style={{ fontSize: "2.8rem" }}>🔑</div>
            <div className="game-tile-name" style={{ fontSize: "1.35rem", fontWeight: 800 }}>Join a Game</div>
            <div className="game-tile-desc" style={{ fontSize: "0.9rem" }}>Enter a 4-letter room code to join an existing game.</div>

            <div className="field" style={{ width: "100%", marginTop: "0.3rem", marginBottom: "0" }}>
              <input
                style={{ textAlign: "center", letterSpacing: "5px", fontSize: "1.3rem", textTransform: "uppercase", padding: "0.65rem", fontWeight: 900, borderRadius: "14px" }}
                value={props.roomCode}
                onChange={(e) => props.setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                maxLength={4}
                disabled={!props.name.trim()}
              />
            </div>

            <button
              className="btn"
              style={{ width: "100%", marginTop: "0.6rem", padding: "12px 24px", fontWeight: 800, fontSize: "1.05rem", borderRadius: "14px" }}
              onClick={() => {
                console.log(`Joining room ${props.roomCode}... Version: ${serverVersion}`);
                props.onJoin();
              }}
              disabled={!props.name.trim() || props.roomCode.trim().length !== 4}
            >
              Join Room
            </button>
          </div>
        </div>

        <div style={{ marginTop: "clamp(0.6rem, 1vh, 1rem)" }}>
          <button
            type="button"
            className="btn"
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: "1.05rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
              border: "1.5px solid rgba(168, 85, 247, 0.5)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              borderRadius: "14px",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(99, 102, 241, 0.25)",
              transition: "all 0.2s ease"
            }}
            onClick={props.onPractice}
          >
            <span style={{ fontSize: "1.3rem" }}>🎨</span>
            <span>Practice Mode</span>
          </button>
        </div>

        {props.error && (
          <div className="error scale-in" style={{ marginTop: "0.75rem", padding: "0.65rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.15)", fontSize: "0.9rem" }}>
            {props.error}
          </div>
        )}

        {serverVersion && (
          <div style={{ marginTop: "0.75rem", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.8rem", fontWeight: 600 }}>
            Version: {serverVersion}
          </div>
        )}
      </div>
    </div>
  );
}

