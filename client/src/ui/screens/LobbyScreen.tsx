import React, { useState, useEffect } from "react";
import type { RoomState } from "../../types";
import QRCode from "qrcode";

type SettingsTab = "timers" | "twists" | "prompts";

export function LobbyScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  isHost: boolean;
  onStart: () => void;
  onUpdateSettings: (settings: Partial<RoomState>) => void;
  onToggleSpectator?: (ack?: (resp: { ok?: boolean; error?: string }) => void) => void;
  onLeave: () => void;
  onKick?: (playerId: string) => void;
  onPractice?: () => void;
}) {
  const { room } = props;
  const [specMsg, setSpecMsg] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("timers");
  const [customPromptsText, setCustomPromptsText] = useState(() => (room.customPrompts ?? []).join("\n"));

  useEffect(() => {
    if ((room.customPrompts?.length ?? 0) > 0 && !customPromptsText.trim()) {
      setCustomPromptsText((room.customPrompts ?? []).join("\n"));
    }
  }, [room.customPrompts]);

  const parseAndSaveCustomPrompts = (raw: string) => {
    setCustomPromptsText(raw);
    const parsed = Array.from(
      new Set(
        raw
          .split(/[\n,]+/)
          .map((s) => s.trim().slice(0, 80))
          .filter((s) => s.length > 0)
      )
    ).slice(0, 200);
    props.onUpdateSettings({ customPrompts: parsed });
  };

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

  const activeTwistsCount =
    room.gameType === "drawful"
      ? [
          Boolean(room.useRandomTricks),
          Boolean(room.finalChaosRound),
          room.enableStrokeReplay !== false,
          Boolean(room.useExtraPrompt)
        ].filter(Boolean).length
      : [
          Boolean(room.fakeArtistInkLimit),
          Boolean(room.fakeArtistHighlight),
          Boolean(room.fakeArtistRandomizeOrder)
        ].filter(Boolean).length;

  const customPromptsCount = room.useCustomPrompts ? (room.customPrompts?.length ?? 0) : 0;

  return (
    <div className="page">
      <div className="card lobby-card">
        {/* Top Header Bar */}
        <div className="lobby-topbar">
          <div className="lobby-topbar-left">
            <div className="lobby-title-row">
              <h2 style={{ margin: 0 }}>Lobby</h2>
              <div
                className="pill room-code-pill"
                style={{ margin: 0, padding: "5px 14px", cursor: "pointer", fontSize: "0.95rem" }}
                onClick={() => {
                  navigator.clipboard.writeText(room.roomCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                title="Click to copy 4-letter room code"
              >
                {room.roomCode} {copiedCode ? "✓ Copied!" : "📋"}
              </div>
              <button
                type="button"
                className="btn"
                style={{ padding: "5px 12px", fontSize: "0.78rem", borderRadius: "99px" }}
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                title="Copy direct invite link for friends"
              >
                {copiedLink ? "✓ Link Copied!" : "🔗 Invite Link"}
              </button>
            </div>
            <div className="muted small">
              Share the room code, send the invite link, or scan the QR code to join.
            </div>
          </div>

          <div className="lobby-topbar-right">
            {qrUrl && (
              <div className="lobby-qr-badge" title="Scan with mobile camera to join instantly">
                <img src={qrUrl} alt="QR Code" style={{ width: "54px", height: "54px", display: "block" }} />
                <span>SCAN</span>
              </div>
            )}
            <div className="lobby-topbar-actions">
              {props.onPractice && (
                <button
                  className="btn"
                  onClick={props.onPractice}
                  style={{
                    background: "rgba(99, 102, 241, 0.18)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#a5b4fc",
                    fontWeight: 700,
                    padding: "7px 13px",
                    fontSize: "0.84rem"
                  }}
                  title="Test all 30 party tricks in the Practice Sandbox"
                >
                  🎨 Practice
                </button>
              )}
              {props.onToggleSpectator && (
                <button
                  type="button"
                  className="btn btn-spectator-toggle"
                  style={{ padding: "7px 13px", fontSize: "0.84rem" }}
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
                      <span>Join as Player</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-toggle-icon">👁</span>
                      <span>Spectate</span>
                    </>
                  )}
                </button>
              )}
              <button className="btn" onClick={props.onLeave} style={{ padding: "7px 13px", fontSize: "0.84rem" }}>
                Leave
              </button>
            </div>
          </div>
        </div>

        {specMsg ? (
          <div className="error small" style={{ marginBottom: "8px" }}>
            {specMsg}
          </div>
        ) : null}

        {/* Main 2-Column Lobby Body */}
        <div className="lobby-grid">
          {/* LEFT COLUMN: Players Roster & Launch Pad */}
          <div className="lobby-roster-panel">
            <div className="lobby-section-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.02rem" }}>Players ({room.players.length})</h3>
                <span className="muted small">
                  {playingConnected + bots} active{bots > 0 ? ` (${bots} bot${bots === 1 ? "" : "s"})` : ""}
                </span>
              </div>
              {props.isHost && (
                <div className="lobby-bot-control" title="Add AI bots for testing or filling seats">
                  <label htmlFor="lobby-bots-select">🤖 Bots</label>
                  <select
                    id="lobby-bots-select"
                    value={room.botCount ?? 0}
                    onChange={(e) => props.onUpdateSettings({ botCount: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="lobby-player-list">
              {room.players.map((p) => (
                <div key={p.id} className="listItem lobby-player-item" style={{ borderLeft: `4px solid ${p.color || "#818cf8"}` }}>
                  <div className="name" style={{ minWidth: 0, flexWrap: "wrap", gap: "6px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: p.color || "#818cf8",
                        boxShadow: `0 0 8px ${p.color || "#818cf8"}`,
                        flexShrink: 0
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    {p.id === props.me.id ? <span className="muted small">(you)</span> : null}
                    {p.id === room.hostId ? <span className="tag">👑 host</span> : null}
                    {p.isSpectator ? <span className="tag">👁 spectator</span> : null}
                  </div>
                  <div className={p.connected ? "ok" : "muted"} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", flexShrink: 0 }}>
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

            <div className="lobby-launch-card">
              <div className="lobby-launch-info">
                {!canStart && room.gameType ? (
                  <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.82rem" }}>
                    ⚠️ Need at least {minPlayers} players (or add bots) to start {room.gameType === "fake_artist" ? "Fake Artist" : "Drawful"}.
                  </span>
                ) : props.isHost ? (
                  <span className="muted small">Ready to launch for {playingConnected + bots} players!</span>
                ) : (
                  <span className="muted small">⏳ Waiting for host to start the match…</span>
                )}
              </div>
              {props.isHost && (
                <button
                  className="btn primary lobby-start-btn"
                  onClick={props.onStart}
                  disabled={!props.isHost || !room.gameType || !canStart}
                >
                  🚀 Start Game
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Game Mode & Categorized Settings Studio */}
          <div className="lobby-settings-studio">
            {/* Compact Game Mode Switcher */}
            <div className="lobby-mode-section">
              <div className="lobby-section-label">Game Mode</div>
              <div className="lobby-mode-cards">
                <button
                  type="button"
                  disabled={!props.isHost}
                  className={`lobby-mode-card ${room.gameType === "drawful" ? "active" : ""}`}
                  onClick={() => props.isHost && props.onUpdateSettings({ gameType: "drawful" })}
                >
                  <span className="lobby-mode-icon">🎨</span>
                  <div className="lobby-mode-text">
                    <div className="lobby-mode-title">Drawful</div>
                    <div className="lobby-mode-sub">Draw prompts, bluff & vote</div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!props.isHost}
                  className={`lobby-mode-card ${room.gameType === "fake_artist" ? "active" : ""}`}
                  onClick={() => props.isHost && props.onUpdateSettings({ gameType: "fake_artist" })}
                >
                  <span className="lobby-mode-icon">🕵️</span>
                  <div className="lobby-mode-text">
                    <div className="lobby-mode-title">Fake Artist</div>
                    <div className="lobby-mode-sub">Shared canvas & social deduction</div>
                  </div>
                </button>
              </div>
            </div>

            {props.isHost ? (
              <>
                {/* Segmented Settings Tabs */}
                <div className="settings-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "timers"}
                    className={`settings-tab ${activeTab === "timers" ? "active" : ""}`}
                    onClick={() => setActiveTab("timers")}
                  >
                    <span>⏱️</span>
                    <span>Timers & Pacing</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "twists"}
                    className={`settings-tab ${activeTab === "twists" ? "active" : ""}`}
                    onClick={() => setActiveTab("twists")}
                  >
                    <span>{room.gameType === "drawful" ? "🎪" : "🕵️"}</span>
                    <span>{room.gameType === "drawful" ? "Party Twists" : "Mode Options"}</span>
                    {activeTwistsCount > 0 && <span className="settings-tab-badge">{activeTwistsCount}</span>}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "prompts"}
                    className={`settings-tab ${activeTab === "prompts" ? "active" : ""}`}
                    onClick={() => setActiveTab("prompts")}
                  >
                    <span>📝</span>
                    <span>Custom Prompts</span>
                    {customPromptsCount > 0 && <span className="settings-tab-badge">{customPromptsCount}</span>}
                  </button>
                </div>

                {/* TAB 1: TIMERS & PACING */}
                {activeTab === "timers" && (
                  <div className="settings-tab-body fade-in">
                    <div className="settings-grid">
                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">🔄 Total Rounds</div>
                          <div className="setting-card-desc">Number of rounds before Game Over</div>
                        </div>
                        <select
                          value={room.totalRounds}
                          onChange={(e) => props.onUpdateSettings({ totalRounds: Number(e.target.value) })}
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n} Round{n > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>

                      {room.gameType === "drawful" ? (
                        <>
                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">🎨 Drawing Timer</div>
                              <div className="setting-card-desc">Time to sketch your secret prompt</div>
                            </div>
                            <select
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

                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">✍️ Bluffing Timer</div>
                              <div className="setting-card-desc">Time to write a fake prompt</div>
                            </div>
                            <select
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

                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">🗳️ Voting Timer</div>
                              <div className="setting-card-desc">Time to pick the real prompt</div>
                            </div>
                            <select
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
                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">⏱️ Turn Timer</div>
                            <div className="setting-card-desc">Time per stroke & accusation</div>
                          </div>
                          <select
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

                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">⏭️ Auto-Next Reveal</div>
                          <div className="setting-card-desc">Automatically advance to next drawing/round</div>
                        </div>
                        <select
                          value={room.revealTimerSeconds ?? 0}
                          onChange={(e) => props.onUpdateSettings({ revealTimerSeconds: Number(e.target.value) })}
                        >
                          <option value={0}>Manual (Host Clicks)</option>
                          <option value={8}>8s</option>
                          <option value={12}>12s</option>
                          <option value={15}>15s</option>
                          <option value={20}>20s</option>
                          <option value={30}>30s</option>
                          <option value={45}>45s</option>
                        </select>
                      </div>

                      {room.gameType === "drawful" && (
                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">🔀 Reveal Order</div>
                            <div className="setting-card-desc">Order in which drawings are shown</div>
                          </div>
                          <select
                            value={room.revealOrder || "random"}
                            onChange={(e) => props.onUpdateSettings({ revealOrder: e.target.value as "random" | "round_robin" })}
                          >
                            <option value="random">🎲 Random Order</option>
                            <option value="round_robin">🔁 Round Robin</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PARTY TWISTS / MODE OPTIONS */}
                {activeTab === "twists" && (
                  <div className="settings-tab-body fade-in">
                    {room.gameType === "drawful" ? (
                      <div className="settings-stack">
                        <div className={`setting-card setting-card-featured ${room.useRandomTricks ? "active-twist" : ""}`}>
                          <div className="setting-card-row">
                            <div className="setting-card-info">
                              <div className="setting-card-title">⚡ Drawful Trick Mode (30 Party Tricks)</div>
                              <div className="setting-card-desc">Wild canvas modifiers like Spinning Canvas, Alien Vaporizer, Magnet Anomaly & more!</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={room.useRandomTricks || false}
                              onChange={(e) => props.onUpdateSettings({ useRandomTricks: e.target.checked })}
                            />
                          </div>

                          {room.useRandomTricks && (
                            <div className="setting-subpanel">
                              <div className="setting-subrow">
                                <label>Trick Assignment</label>
                                <select
                                  value={
                                    room.selectedTrick && room.selectedTrick !== "random"
                                      ? "specific"
                                      : room.sameTrickForAll
                                        ? "same"
                                        : "random"
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "random") {
                                      props.onUpdateSettings({ sameTrickForAll: false, selectedTrick: "random" });
                                    } else if (val === "same") {
                                      props.onUpdateSettings({ sameTrickForAll: true, selectedTrick: "random" });
                                    } else if (val === "specific") {
                                      const current = room.selectedTrick && room.selectedTrick !== "random" ? room.selectedTrick : "blind";
                                      props.onUpdateSettings({ sameTrickForAll: true, selectedTrick: current });
                                    }
                                  }}
                                >
                                  <option value="random">🎲 Random Per Player</option>
                                  <option value="same">⚡ Same Random Trick For All</option>
                                  <option value="specific">🎯 Specific Trick (Choose Below)</option>
                                </select>
                              </div>

                              {room.selectedTrick && room.selectedTrick !== "random" && (
                                <div className="setting-subrow">
                                  <label>Choose Trick</label>
                                  <select
                                    value={room.selectedTrick}
                                    onChange={(e) => props.onUpdateSettings({ selectedTrick: e.target.value as any })}
                                  >
                                    <option value="blind">🙈 Blind Drawing</option>
                                    <option value="one_stroke">✏️ One Stroke Only</option>
                                    <option value="large_brush">🖌️ Mega Brush (35px)</option>
                                    <option value="random_brush">🎲 Brush Roulette (Dynamic Sizes)</option>
                                    <option value="half_time">⚡ Speed Rush (20s)</option>
                                    <option value="upside_down">🙃 Inverted Controls</option>
                                    <option value="wobble">〰️ Earthquake Wobble</option>
                                    <option value="mirror">🪞 Mirror Symmetry</option>
                                    <option value="ink_limit">🖋️ Ink Budget (3,000px)</option>
                                    <option value="rubberband">🐦 Slingshot (Curved Ballistic Shots)</option>
                                    <option value="input_delay">⏱️ 2s Lag + Vanishing Ink</option>
                                    <option value="spinning">🎠 Spinning Canvas (Continuous 360°)</option>
                                    <option value="glitch">👾 Glitch Teleport (Jitter Jumps)</option>
                                    <option value="gravity_drip">💧 Gravity Drip (Melting Paint)</option>
                                    <option value="pixel_art">🧱 8-Bit Pixel Block (Chunky Grid)</option>
                                    <option value="bubbles">🫧 Bubble Stamping (Cluster Bubbles)</option>
                                    <option value="split_halves">🪓 Guillotine Chop (Random Half Sliced)</option>
                                    <option value="flashlight">🕯️ Spotlight in the Dark (Flashlight)</option>
                                    <option value="ice_skater">🧊 Ice Skater (Smooth Gliding)</option>
                                    <option value="typo_stomp">🔤 Typo Stomp (ASCII Letter Trail)</option>
                                    <option value="shadow_finger">🌑 Reverse Spotlight (Shadow Finger)</option>
                                    <option value="trash_compactor">🗑️ Trash Compactor (Shrinking Walls)</option>
                                    <option value="puzzle_jumble">🧩 Puzzle Jumble (Numbered Puzzle Scramble)</option>
                                    <option value="snake_tail">🐍 Snake (Head & Tail)</option>
                                    <option value="tractor_beam">🛸 Alien Vaporizer (Beam Disintegrator)</option>
                                    <option value="cubism">🔺 Polygon Cubism (Geometric Shapes)</option>
                                    <option value="spiderweb">🕸️ Spiderweb Threads (Cobweb Shading)</option>
                                    <option value="magnets">🧲 Magnet Anomaly (Attract & Repel Poles)</option>
                                    <option value="wind_tunnel">🌬️ Wind Tunnel (Drifting Wet Ink)</option>
                                    <option value="poltergeist">👻 Poltergeist Brush (Ghost Possession)</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="settings-grid">
                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">🔥 Final Chaos Round</div>
                              <div className="setting-card-desc">Bonus finale where everyone draws the same prompt & guesses who drew what</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={room.finalChaosRound || false}
                              onChange={(e) => props.onUpdateSettings({ finalChaosRound: e.target.checked })}
                            />
                          </div>

                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">🎬 Stroke Replay</div>
                              <div className="setting-card-desc">Play animated time-lapse of strokes when revealing drawings</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={room.enableStrokeReplay !== false}
                              onChange={(e) => props.onUpdateSettings({ enableStrokeReplay: e.target.checked })}
                            />
                          </div>

                          <div className="setting-card">
                            <div className="setting-card-info">
                              <div className="setting-card-title">🤖 Extra Decoy Prompt</div>
                              <div className="setting-card-desc">Add a smart AI-style decoy option to every vote</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={room.useExtraPrompt}
                              onChange={(e) => props.onUpdateSettings({ useExtraPrompt: e.target.checked })}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="settings-grid">
                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">📚 Themed Word Pack</div>
                            <div className="setting-card-desc">Category ideas for the Question Master</div>
                          </div>
                          <select
                            value={room.fakeArtistWordPack || "all"}
                            onChange={(e) => props.onUpdateSettings({ fakeArtistWordPack: e.target.value })}
                          >
                            <option value="all">🌟 All Categories</option>
                            <option value="movies">🎬 Movies & TV</option>
                            <option value="gaming">🎮 Gaming & Pop Culture</option>
                            <option value="animals">🐾 Animals & Nature</option>
                            <option value="food">🍕 Food & Drinks</option>
                            <option value="landmarks">🗽 Landmarks & World</option>
                            <option value="superheroes">🦸 Superheroes & Fantasy</option>
                          </select>
                        </div>

                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">🔍 Highlight Strokes</div>
                            <div className="setting-card-desc">Hover suspects during Accuse to isolate their lines</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={room.fakeArtistHighlight}
                            onChange={(e) => props.onUpdateSettings({ fakeArtistHighlight: e.target.checked })}
                          />
                        </div>

                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">🔀 Randomize Order</div>
                            <div className="setting-card-desc">Shuffle artist turn order at match start</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={room.fakeArtistRandomizeOrder || false}
                            onChange={(e) => props.onUpdateSettings({ fakeArtistRandomizeOrder: e.target.checked })}
                          />
                        </div>

                        <div className="setting-card">
                          <div className="setting-card-info">
                            <div className="setting-card-title">🖋️ Ink Meter Budget</div>
                            <div className="setting-card-desc">Limit how much ink each stroke can use</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={room.fakeArtistInkLimit || false}
                            onChange={(e) => props.onUpdateSettings({ fakeArtistInkLimit: e.target.checked })}
                          />
                        </div>

                        {room.fakeArtistInkLimit && (
                          <div className="setting-card" style={{ gridColumn: "1 / -1" }}>
                            <div className="setting-card-info">
                              <div className="setting-card-title">Max Ink Per Turn: {room.fakeArtistInkBudget || 600}px</div>
                              <div className="setting-card-desc">Slide to adjust stroke length budget</div>
                            </div>
                            <input
                              type="range"
                              min="200"
                              max="1500"
                              step="50"
                              value={room.fakeArtistInkBudget || 600}
                              onChange={(e) => props.onUpdateSettings({ fakeArtistInkBudget: Number(e.target.value) })}
                              style={{ width: "160px", accentColor: "var(--primary2)" }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: CUSTOM PROMPTS */}
                {activeTab === "prompts" && (
                  <div className="settings-tab-body fade-in">
                    <div className="setting-card" style={{ marginBottom: "10px" }}>
                      <div className="setting-card-info">
                        <div className="setting-card-title">📝 Enable Custom Prompts</div>
                        <div className="setting-card-desc">
                          {room.gameType === "drawful"
                            ? "Include your own inside jokes and custom drawing prompts"
                            : "Provide custom 'Category: Word' ideas for the Question Master"}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={room.useCustomPrompts || false}
                        onChange={(e) => props.onUpdateSettings({ useCustomPrompts: e.target.checked })}
                      />
                    </div>

                    {room.useCustomPrompts && (
                      <div className="setting-subpanel" style={{ marginTop: 0 }}>
                        <div className="row space" style={{ flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#c4b5fd" }}>
                            One prompt per line (or comma-separated):
                          </span>
                          <span className="tag" style={{ padding: "2px 8px", fontSize: "0.74rem" }}>
                            {(room.customPrompts ?? []).length} saved
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={customPromptsText}
                          onChange={(e) => parseAndSaveCustomPrompts(e.target.value)}
                          placeholder={"e.g.\nMartin's legendary coffee\nA cat debugging TypeScript\nAnimals: Capybara"}
                          style={{
                            width: "100%",
                            borderRadius: "10px",
                            padding: "0.55rem 0.75rem",
                            background: "rgba(15, 23, 42, 0.85)",
                            border: "1px solid rgba(255, 255, 255, 0.16)",
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: "0.84rem",
                            resize: "vertical"
                          }}
                        />
                        <div className="setting-subrow" style={{ marginTop: "6px" }}>
                          <label style={{ fontSize: "0.8rem" }}>Use ONLY Custom Prompts (don't mix with standard prompts)</label>
                          <input
                            type="checkbox"
                            checked={room.customPromptsOnly || false}
                            onChange={(e) => props.onUpdateSettings({ customPromptsOnly: e.target.checked })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Non-Host Live Configuration Summary */
              <div className="settings-tab-body">
                <div className="muted small" style={{ marginBottom: "8px" }}>
                  Host is configuring the match settings:
                </div>
                <div className="settings-grid">
                  <div className="setting-card">
                    <div className="setting-card-info">
                      <div className="setting-card-title">🔄 Rounds</div>
                      <div className="setting-card-desc">Total match length</div>
                    </div>
                    <span className="tag">{room.totalRounds} Round{room.totalRounds > 1 ? "s" : ""}</span>
                  </div>

                  {room.gameType === "drawful" ? (
                    <>
                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">⏱️ Stage Timers</div>
                          <div className="setting-card-desc">Draw / Bluff / Vote</div>
                        </div>
                        <span className="tag">
                          {(room.drawTimerSeconds ?? room.timerSeconds) ? `${room.drawTimerSeconds ?? room.timerSeconds}s` : "Off"} /{" "}
                          {(room.submitTimerSeconds ?? room.timerSeconds) ? `${room.submitTimerSeconds ?? room.timerSeconds}s` : "Off"} /{" "}
                          {(room.voteTimerSeconds ?? room.timerSeconds) ? `${room.voteTimerSeconds ?? room.timerSeconds}s` : "Off"}
                        </span>
                      </div>

                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">⏭️ Auto-Next Reveal</div>
                          <div className="setting-card-desc">Advance between drawings</div>
                        </div>
                        <span className="tag">{room.revealTimerSeconds ? `${room.revealTimerSeconds}s` : "Manual"}</span>
                      </div>

                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">⚡ Party Tricks</div>
                          <div className="setting-card-desc">Canvas modifiers</div>
                        </div>
                        <span className="tag" style={room.useRandomTricks ? { color: "#fbbf24", borderColor: "rgba(251,191,36,0.35)" } : undefined}>
                          {room.useRandomTricks
                            ? room.selectedTrick && room.selectedTrick !== "random"
                              ? room.selectedTrick
                              : room.sameTrickForAll
                                ? "Same Trick"
                                : "Random Per Player"
                            : "Off"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">⏱️ Turn Timer</div>
                          <div className="setting-card-desc">Per stroke & vote</div>
                        </div>
                        <span className="tag">{room.timerSeconds ? `${room.timerSeconds}s` : "No Timer"}</span>
                      </div>

                      <div className="setting-card">
                        <div className="setting-card-info">
                          <div className="setting-card-title">📚 Word Pack</div>
                          <div className="setting-card-desc">Category theme</div>
                        </div>
                        <span className="tag">{room.fakeArtistWordPack || "all"}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Compact Active Configuration Footer Strip */}
            <div className="lobby-summary-strip">
              <span className="tag">🔄 {room.totalRounds}R</span>
              {room.gameType === "drawful" ? (
                <>
                  <span className="tag">
                    🎨 {(room.drawTimerSeconds ?? room.timerSeconds) ? `${room.drawTimerSeconds ?? room.timerSeconds}s` : "∞"}
                  </span>
                  <span className="tag">
                    ⏭️ {room.revealTimerSeconds ? `Auto ${room.revealTimerSeconds}s` : "Manual Next"}
                  </span>
                  {room.useRandomTricks && (
                    <span className="tag" style={{ color: "#fbbf24", borderColor: "rgba(251,191,36,0.35)" }}>
                      ⚡ Tricks On
                    </span>
                  )}
                  {room.finalChaosRound && (
                    <span className="tag" style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.35)" }}>
                      🔥 Chaos Finale
                    </span>
                  )}
                  {room.enableStrokeReplay !== false && <span className="tag">🎬 Replay</span>}
                </>
              ) : (
                <>
                  <span className="tag">⏱️ {room.timerSeconds ? `${room.timerSeconds}s` : "∞"}</span>
                  <span className="tag">📚 {room.fakeArtistWordPack || "all"}</span>
                  {room.fakeArtistInkLimit && <span className="tag">🖋️ {room.fakeArtistInkBudget || 600}px</span>}
                </>
              )}
              {customPromptsCount > 0 && (
                <span className="tag" style={{ color: "#c4b5fd", borderColor: "rgba(139,92,246,0.35)" }}>
                  📝 {customPromptsCount} Custom
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
