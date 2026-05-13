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
}) {
  const [serverVersion, setServerVersion] = useState<string>(
    import.meta.env.VITE_APP_VERSION || ""
  );

  useEffect(() => {
    fetch(`${SERVER_URL}/api/version`)
      .then(r => r.json())
      .then(d => {
        if (d.version) setServerVersion(d.version);
        else console.error("Version endpoint returned empty", d);
      })
      .catch((err) => {
        console.error("Failed to fetch version:", err);
      });
  }, []);

  return (
    <div className="page center" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: "900px", width: "95%", textAlign: "center" }}>
        <img
          src={logoUrl}
          alt="TeaDraw Logo"
          style={{
            maxWidth: "350px",
            width: "100%",
            marginBottom: "1rem",
            filter: "drop-shadow(0 0 20px rgba(255, 255, 255, 0.2))"
          }}
        />

        <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.8rem" }}>First, enter your name:</label>
            <input
              style={{ textAlign: "center", fontSize: "1.5rem", padding: "1rem" }}
              value={props.name}
              onChange={(e) => props.setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={18}
            />
          </div>
        </div>

        <div className="game-tiles" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <div className={`game-tile ${props.name.trim() ? "" : "disabled"}`} style={{ height: "auto", padding: "2.5rem 2rem" }}>
            <div className="game-tile-icon">🏠</div>
            <div className="game-tile-name">Host a Game</div>
            <div className="game-tile-desc">Create a new private room and invite your friends to play.</div>
            <button 
              className="btn primary" 
              style={{ width: "100%", marginTop: "1.5rem" }} 
              onClick={() => {
                console.log(`Creating room... Version: ${serverVersion}`);
                props.onCreate();
              }} 
              disabled={!props.name.trim()}
            >
              Create Room
            </button>
          </div>

          <div className={`game-tile ${props.name.trim() ? "" : "disabled"}`} style={{ height: "auto", padding: "2.5rem 2rem" }}>
            <div className="game-tile-icon">🔑</div>
            <div className="game-tile-name">Join a Game</div>
            <div className="game-tile-desc">Enter a 4-letter room code to join an existing game.</div>

            <div className="field" style={{ width: "100%", marginTop: "1rem", marginBottom: "0" }}>
              <input
                style={{ textAlign: "center", letterSpacing: "4px", fontSize: "1.4rem", textTransform: "uppercase" }}
                value={props.roomCode}
                onChange={(e) => props.setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                maxLength={4}
                disabled={!props.name.trim()}
              />
            </div>

            <button
              className="btn"
              style={{ width: "100%", marginTop: "1.5rem" }}
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

        {props.error && (
          <div className="error scale-in" style={{ marginTop: "2rem", padding: "1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)" }}>
            {props.error}
          </div>
        )}

        {serverVersion && (
          <div style={{ marginTop: "2rem", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.9rem" }}>
            Version: {serverVersion}
          </div>
        )}
      </div>
    </div>
  );
}

