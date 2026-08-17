import React, { useState, useEffect } from "react";
import type { RoomState } from "../../types";
import QRCode from "qrcode";

export function LobbyScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  isHost: boolean;
  onStart: () => void;
  onUpdateSettings: (settings: Partial<RoomState>) => void;
  onToggleSpectator?: (ack?: (resp: { ok?: boolean; error?: string }) => void) => void;
  onLeave: () => void;
  onKick?: (playerId: string) => void;
}) {
  const { room } = props;
  const [specMsg, setSpecMsg] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = `${window.location.origin}${window.location.pathname}#code=${room.roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(inviteUrl, { width: 160, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((url) => setQrUrl(url))
      .catch(() => {});
  }, [inviteUrl]);

  const playingConnected = room.players.filter((p) => p.connected && !p.isSpectator).length;
  const bots = room.botCount ?? 0;
  const minPlayers = room.gameType === "fake_artist" ? 3 : 2;
  const canStart = playingConnected + bots >= minPlayers;

  return (
    <div className="page">
      <div className="card">
        <div className="row space" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.5rem" }}>
            <h2>Lobby</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Room code:</span>
              <div
                className="pill room-code-pill"
                style={{ margin: 0, padding: "8px 18px", cursor: "pointer" }}
                onClick={() => {
                  navigator.clipboard.writeText(room.roomCode);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                title="Click to copy room code"
              >
                {room.roomCode}
              </div>
              <button
                className="btn"
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
              >
                🔗 {copiedLink ? "Link Copied!" : "Copy Join Link"}
              </button>
            </div>
          </div>

          <div className="row" style={{ gap: "16px", alignItems: "center" }}>
            {qrUrl && (
              <div
                style={{
                  background: "#fff",
                  padding: "6px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                  textAlign: "center"
                }}
                title="Scan with mobile camera to join instantly"
              >
                <img src={qrUrl} alt="QR Code" style={{ width: "90px", height: "90px", display: "block" }} />
                <div style={{ color: "#0f172a", fontSize: "0.65rem", fontWeight: 800 }}>SCAN TO JOIN</div>
              </div>
            )}
            <button className="btn" onClick={props.onLeave}>
              Leave
            </button>
          </div>
        </div>

        <h3>Players</h3>
        <div className="list">
          {room.players.map((p) => (
            <div key={p.id} className="listItem">
              <div className="name">
                {p.name} {p.id === props.me.id ? <span className="muted">(you)</span> : null}
                {p.id === room.hostId ? <span className="tag">host</span> : null}
                {p.isSpectator ? <span className="tag">spectator</span> : null}
              </div>
              <div className={p.connected ? "ok" : "muted"} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{p.connected ? "online" : "offline"}</span>
                {props.isHost && p.id !== props.me.id && (
                  <button
                    className="btn danger small"
                    style={{ padding: "2px 6px", fontSize: "10px" }}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to kick ${p.name}?`)) {
                        props.onKick?.(p.id);
                      }
                    }}
                  >
                    Kick
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {props.onToggleSpectator ? (
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="btn btn-spectator-toggle"
              onClick={() => {
                setSpecMsg("");
                props.onToggleSpectator?.((resp) => {
                  if (resp && !resp.ok) setSpecMsg(resp.error ?? "Could not update spectator mode.");
                });
              }}
            >
              {props.me.isSpectator ? (
                <>
                  <span className="btn-toggle-icon">🎮</span>
                  <span>Play</span>
                </>
              ) : (
                <>
                  <span className="btn-toggle-icon">👁</span>
                  <span>Watch as Spectator</span>
                </>
              )}
            </button>
            {specMsg ? (
              <div className="error small" style={{ marginTop: "8px" }}>
                {specMsg}
              </div>
            ) : null}
          </div>
        ) : null}

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
                      <option key={n} value={n}>{n}{"\u00a0\u00a0\u00a0"}Round{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>

                {room.gameType === "drawful" ? (
                  <>
                    <div className="setting-row">
                      <label>Drawing Time:</label>
                      <select
                        disabled={!props.isHost}
                        value={room.drawTimerSeconds ?? room.timerSeconds}
                        onChange={(e) => props.onUpdateSettings({ drawTimerSeconds: Number(e.target.value) })}
                      >
                        <option value={0}>No Timer</option>
                        <option value={30}>30s</option>
                        <option value={45}>45s</option>
                        <option value={60}>60s</option>
                        <option value={90}>90s</option>
                        <option value={120}>120s</option>
                      </select>
                    </div>

                    <div className="setting-row">
                      <label>Prompting Time:</label>
                      <select
                        disabled={!props.isHost}
                        value={room.submitTimerSeconds ?? room.timerSeconds}
                        onChange={(e) => props.onUpdateSettings({ submitTimerSeconds: Number(e.target.value) })}
                      >
                        <option value={0}>No Timer</option>
                        <option value={15}>15s</option>
                        <option value={30}>30s</option>
                        <option value={45}>45s</option>
                        <option value={60}>60s</option>
                        <option value={90}>90s</option>
                      </select>
                    </div>

                    <div className="setting-row">
                      <label>Voting Time:</label>
                      <select
                        disabled={!props.isHost}
                        value={room.voteTimerSeconds ?? room.timerSeconds}
                        onChange={(e) => props.onUpdateSettings({ voteTimerSeconds: Number(e.target.value) })}
                      >
                        <option value={0}>No Timer</option>
                        <option value={15}>15s</option>
                        <option value={30}>30s</option>
                        <option value={45}>45s</option>
                        <option value={60}>60s</option>
                        <option value={90}>90s</option>
                      </select>
                    </div>
                  </>
                ) : (
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
                )}

                <div className="setting-row">
                  <label>Bots (for testing):</label>
                  <select
                    disabled={!props.isHost}
                    value={room.botCount ?? 0}
                    onChange={(e) => props.onUpdateSettings({ botCount: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {room.gameType === "fake_artist" && (
                  <>
                    <div className="setting-row">
                      <label>Themed Word Pack 📚:</label>
                      <select
                        disabled={!props.isHost}
                        value={room.fakeArtistWordPack || "all"}
                        onChange={(e) => props.onUpdateSettings({ fakeArtistWordPack: e.target.value })}
                      >
                        <option value="all">🌟 All Categories (Standard)</option>
                        <option value="movies">🎬 Movies & TV</option>
                        <option value="gaming">🎮 Gaming & Pop Culture</option>
                        <option value="animals">🐾 Animals & Nature</option>
                        <option value="food">🍕 Food & Drinks</option>
                        <option value="landmarks">🗽 Landmarks & World</option>
                        <option value="superheroes">🦸 Superheroes & Fantasy</option>
                      </select>
                    </div>
                    <div className="setting-row">
                      <label>Ink Meter (Stroke Budget) 🖋️:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.fakeArtistInkLimit || false}
                        onChange={(e) => props.onUpdateSettings({ fakeArtistInkLimit: e.target.checked })}
                      />
                    </div>
                    {room.fakeArtistInkLimit && (
                      <div className="setting-row" style={{ paddingLeft: "1.2rem" }}>
                        <label>Max Budget: {room.fakeArtistInkBudget || 600}px</label>
                        <input
                          type="range"
                          min="200"
                          max="1500"
                          step="50"
                          disabled={!props.isHost}
                          value={room.fakeArtistInkBudget || 600}
                          onChange={(e) => props.onUpdateSettings({ fakeArtistInkBudget: Number(e.target.value) })}
                        />
                      </div>
                    )}
                    <div className="setting-row">
                      <label>Highlight Strokes:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.fakeArtistHighlight}
                        onChange={(e) => props.onUpdateSettings({ fakeArtistHighlight: e.target.checked })}
                      />
                    </div>
                    <div className="setting-row">
                      <label>Randomize Player Order:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.fakeArtistRandomizeOrder || false}
                        onChange={(e) => props.onUpdateSettings({ fakeArtistRandomizeOrder: e.target.checked })}
                      />
                    </div>
                  </>
                )}

                {room.gameType === "drawful" && (
                  <>
                    <div className="setting-row">
                      <label>Extra Random Prompt:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.useExtraPrompt}
                        onChange={(e) => props.onUpdateSettings({ useExtraPrompt: e.target.checked })}
                      />
                    </div>
                    <div className="setting-row">
                      <label>Final Chaos Round 🔥:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.finalChaosRound || false}
                        onChange={(e) => props.onUpdateSettings({ finalChaosRound: e.target.checked })}
                      />
                    </div>
                    <div className="setting-row">
                      <label>Random Trick Mode ⚡:</label>
                      <input
                        type="checkbox"
                        disabled={!props.isHost}
                        checked={room.useRandomTricks || false}
                        onChange={(e) => props.onUpdateSettings({ useRandomTricks: e.target.checked })}
                      />
                    </div>
                    {room.useRandomTricks && (
                      <div className="setting-row" style={{ paddingLeft: "1.2rem" }}>
                        <label>Trick Assignment:</label>
                        <select
                          disabled={!props.isHost}
                          value={room.sameTrickForAll ? "same" : "random"}
                          onChange={(e) => props.onUpdateSettings({ sameTrickForAll: e.target.value === "same" })}
                        >
                          <option value="random">Random Per Player</option>
                          <option value="same">All Players Same Trick</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
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
          <button
            className="btn primary"
            onClick={props.onStart}
            disabled={!props.isHost || !room.gameType || !canStart}
          >
            Start game
          </button>
        </div>
        {!props.isHost ? <div className="muted">Waiting for host to start…</div> : null}
      </div>
    </div>
  );
}

