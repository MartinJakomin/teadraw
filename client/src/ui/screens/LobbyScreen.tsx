import React from "react";
import type { RoomState } from "../../types";

export function LobbyScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  isHost: boolean;
  onStart: () => void;
  onUpdateSettings: (settings: Partial<RoomState>) => void;
  onLeave: () => void;
}) {
  const { room } = props;
  const shareText = `Room code: ${room.roomCode}`;

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "2rem" }}>
            <h2>Lobby</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "40px" }}>
              <span className="muted" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Room code:</span>
              <div className="pill" style={{ margin: 0, padding: "8px 16px" }}>{room.roomCode}</div>
            </div>
          </div>
          <button className="btn" onClick={props.onLeave}>
            Leave
          </button>
        </div>

        <h3>Players</h3>
        <div className="list">
          {room.players.map((p) => (
            <div key={p.id} className="listItem">
              <div className="name">
                {p.name} {p.id === props.me.id ? <span className="muted">(you)</span> : null}
                {p.id === room.hostId ? <span className="tag">host</span> : null}
              </div>
              <div className={p.connected ? "ok" : "muted"}>{p.connected ? "online" : "offline"}</div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {props.isHost ? (
          <div className="settings-panel">
            <h3>Room Settings</h3>
            <label style={{ marginBottom: "1rem", display: "block" }}>Select Game Mode</label>
            <div className="game-tiles">
              <div 
                className={`game-tile ${room.gameType === "drawful" ? "active" : ""} ${!props.isHost ? "disabled" : ""}`}
                onClick={() => props.isHost && props.onUpdateSettings({ gameType: "drawful" })}
              >
                <div className="game-tile-icon">🎨</div>
                <div className="game-tile-name">Drawful</div>
                <div className="game-tile-desc">Draw, bluff, vote!</div>
              </div>

              <div 
                className={`game-tile ${room.gameType === "fake_artist" ? "active" : ""} ${!props.isHost ? "disabled" : ""}`}
                onClick={() => props.isHost && props.onUpdateSettings({ gameType: "fake_artist" })}
              >
                <div className="game-tile-icon">🕵️</div>
                <div className="game-tile-name">Fake Artist</div>
                <div className="game-tile-desc">One person doesn't know what to draw. Can you spot the imposter?</div>
              </div>
            </div>

            {room.gameType && (
              <>
                <div className="setting-row">
                  <label>Rounds:</label>
                  <select
                    disabled={!props.isHost}
                    value={room.totalRounds}
                    onChange={(e) => props.onUpdateSettings({ totalRounds: Number(e.target.value) })}
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} Round{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>

                <div className="setting-row">
                  <label>Timer (Seconds):</label>
                  <select
                    disabled={!props.isHost}
                    value={room.timerSeconds}
                    onChange={(e) => props.onUpdateSettings({ timerSeconds: Number(e.target.value) })}
                  >
                    <option value={0}>No Timer</option>
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                  </select>
                </div>

                {room.gameType === "drawful" && (
                  <div className="setting-row">
                    <label>Extra Random Prompt:</label>
                    <input
                      type="checkbox"
                      disabled={!props.isHost}
                      checked={room.useExtraPrompt}
                      onChange={(e) => props.onUpdateSettings({ useExtraPrompt: e.target.checked })}
                    />
                  </div>
                )}

                <div className="setting-row">
                  <label>Bots (for testing):</label>
                  <select
                    disabled={!props.isHost}
                    value={room.botCount ?? 0}
                    onChange={(e) => props.onUpdateSettings({ botCount: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="settings-panel">
            <h3>Game Settings</h3>
            <div className="muted" style={{ marginBottom: "1.5rem" }}>The host is configuring the game...</div>
            {room.gameType ? (
              <div className="game-tile active disabled" style={{ maxWidth: "400px", margin: "0 auto", cursor: "default", transform: "none" }}>
                <div className="game-tile-icon">{room.gameType === "drawful" ? "🎨" : "🕵️"}</div>
                <div className="game-tile-name">{room.gameType === "drawful" ? "Drawful" : "Fake Artist"}</div>
                <div className="game-tile-desc">{room.gameType === "drawful" ? "Draw, bluff, vote!" : "One person doesn't know what to draw. Can you spot the imposter?"}</div>
              </div>
            ) : (
              <div className="muted center" style={{ padding: "2rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>
                No game mode selected yet.
              </div>
            )}
          </div>
        )}

        <div className="divider" />

        <div className="row space">
          <div className="muted">Tip: open on phones and one person hosts on desktop.</div>
          <button className="btn primary" onClick={props.onStart} disabled={!props.isHost || !room.gameType || room.players.filter((p) => p.connected).length + (room.botCount ?? 0) < 2}>
            Start game
          </button>
        </div>
        {!props.isHost ? <div className="muted">Waiting for host to start…</div> : null}
      </div>
    </div>
  );
}

