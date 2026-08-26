import React, { useMemo } from "react";
import type { Reveal, RoomState } from "../../types";
import { TrickBadge } from "../components/TrickBadge";

export function RevealScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  reveal?: Reveal;
  chaosReveal?: RoomState["chaosReveal"];
  isHost: boolean;
  onNext: () => void;
}) {
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of props.room.players) m.set(p.id, p.name);
    return m;
  }, [props.room.players]);

  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of props.room.players) m.set(p.id, p.color);
    return m;
  }, [props.room.players]);

  const isChaos = Boolean(props.room.finalChaosRound && props.room.round > props.room.totalRounds);
  const sorted = [...props.room.players].sort((a, b) => b.score - a.score);

  // --- Grand Chaos Reveal Screen ---
  if (isChaos && props.room.chaosReveal) {
    const chaos = props.room.chaosReveal;
    return (
      <div className="page">
        <div className="card reveal-card">
          <div className="row space" style={{ marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ margin: 0 }}>🔥 Final Chaos Round: Grand Reveal</h2>
              <div className="muted" style={{ marginTop: "4px" }}>
                All secret votes revealed! See who recognized each artist's masterpiece.
              </div>
            </div>
            {props.isHost && !props.me.isSpectator ? (
              <button
                className="btn primary"
                onClick={props.onNext}
                style={{
                  padding: "12px 24px",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  background: "linear-gradient(135deg, #f97316, #ef4444)"
                }}
              >
                Finish Game 🏆
              </button>
            ) : (
              <div className="muted">Waiting for host to continue…</div>
            )}
          </div>

          <div
            style={{
              padding: "12px 20px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.2))",
              border: "1px solid rgba(249, 115, 22, 0.45)",
              color: "#fff",
              textAlign: "center",
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "1.5rem"
            }}
          >
            🔥 Shared Secret Prompt: <b style={{ color: "#fef08a" }}>"{chaos.prompt}"</b>
          </div>

          <div className="reveal-content">
            <div className="reveal-main">
              <div className="chaos-reveal-grid">
                {chaos.drawings.map((d, i) => (
                  <div key={d.id} className="chaos-reveal-card scale-in">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {d.drawerAvatar ? (
                          <img
                            src={d.drawerAvatar}
                            alt={d.drawerName}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", border: `2.5px solid ${d.drawerColor}` }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: d.drawerColor,
                              color: "#fff",
                              fontSize: "1rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900
                            }}
                          >
                            {d.drawerName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fed7aa", textTransform: "uppercase" }}>
                            Artist
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "1.1rem", color: d.drawerColor }}>
                            {d.drawerName}
                          </div>
                        </div>
                      </div>
                      <span className="chaos-drawing-badge">#{i + 1}</span>
                    </div>

                    <img src={d.imageDataUrl} alt={`Art by ${d.drawerName}`} className="chaos-drawing-img" />

                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "rgba(255, 255, 255, 0.7)", marginBottom: "6px" }}>
                        Player Guesses:
                      </div>
                      <div className="chaos-reveal-guesses">
                        {d.guesses.length === 0 ? (
                          <div className="muted small">No other players voted.</div>
                        ) : (
                          d.guesses.map((g) => (
                            <div key={g.voterId} className={`chaos-guess-item ${g.isCorrect ? "correct" : "incorrect"}`}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <b style={{ color: g.voterColor }}>{g.voterName}</b>
                                <span className="muted">guessed</span>
                                <b style={{ color: g.guessedColor }}>{g.guessedName}</b>
                              </div>
                              <span style={{ fontWeight: 800, fontSize: "0.85rem", color: g.isCorrect ? "#10b981" : "#ef4444" }}>
                                {g.isCorrect ? "✅ Correct (+1 pt)" : "❌ Wrong"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-sidebar">
              <h3 style={{ marginBottom: "1rem" }}>Scoreboard</h3>
              <div className="list compact">
                {sorted.map((p) => {
                  const delta = chaos.pointsDeltaByPlayer[p.id] ?? 0;
                  return (
                    <div key={p.id} className="listItem scoreboard-item">
                      <div className="row" style={{ gap: "8px" }}>
                        {p.avatarUrl && <img src={p.avatarUrl} alt="av" className="avatar-tiny" style={{ border: `1px solid ${p.color}` }} />}
                        <div className="name" style={{ color: p.color, fontSize: "0.9rem" }}>{p.name}</div>
                      </div>
                      <div className="scoreLine">
                        {delta !== 0 && (
                          <span className={delta > 0 ? "delta plus" : "delta minus"}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                        <span className="score">{p.score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Regular Drawful Reveal Screen ---
  if (!props.reveal) return null;

  const drawer = props.room.players.find((p) => p.id === props.reveal?.drawerId);
  const drawerName = drawer?.name ?? "Someone";
  const drawerAvatar = drawer?.avatarUrl;
  const drawerColor = drawer?.color ?? "#000";

  const isLastDrawing = props.reveal.drawingIndex >= props.reveal.totalDrawings - 1;
  const maxRounds = props.room.finalChaosRound ? props.room.totalRounds + 1 : props.room.totalRounds;
  const isLastRound = props.room.round >= maxRounds;
  const isEnteringChaosNext = Boolean(props.room.finalChaosRound && props.room.round === props.room.totalRounds && isLastDrawing);

  const nextButtonLabel = isLastDrawing
    ? (isLastRound
        ? "Finish Game 🏆"
        : (isEnteringChaosNext
            ? "Start Final Chaos Round 🔥"
            : "Next Round ➡️"))
    : "Next drawing";

  return (
    <div className="page">
      <div className="card reveal-card">
        <div className="row space" style={{ marginBottom: "1.5rem" }}>
          <div className="row" style={{ gap: "12px", flexWrap: "wrap" }}>
            {drawerAvatar && (
              <img
                src={drawerAvatar}
                alt="drawer"
                className="drawer-avatar-reveal"
                style={{ border: `3px solid ${drawerColor}` }}
              />
            )}
            <div>
              <h2 style={{ margin: 0 }}>Reveal</h2>
              <div className="muted">
                Drawing {props.reveal.drawingIndex + 1} of {props.reveal.totalDrawings} by <b style={{ color: drawerColor }}>{drawerName}</b>
              </div>
            </div>
            {props.reveal.trick && <TrickBadge trick={props.reveal.trick} />}
          </div>
          {props.isHost && !props.me.isSpectator ? (
            <button className="btn primary" onClick={props.onNext}>
              {nextButtonLabel}
            </button>
          ) : (
            <div className="muted">Waiting for host…</div>
          )}
        </div>

        <div className="reveal-content">
          <div className="reveal-main">
            <img className="img reveal-img" src={props.reveal.imageDataUrl} alt="drawing" />

            <div className="prompt reveal-prompt">
              <div className="muted">The real prompt was</div>
              <div className="promptText">{props.reveal.prompt}</div>
            </div>

            <div className="votes-section">
              <h3 style={{ marginBottom: "1rem" }}>Votes & Comedy Awards</h3>
              <div className="list" style={props.reveal.options.length > 4 ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } : undefined}>
                {props.reveal.options.map((o) => {
                  const authorId = o.authorId;
                  const isReal = !authorId;
                  const authorName = authorId === "system" ? "System" : (authorId ? nameById.get(authorId) : null);
                  const authorColor = authorId ? colorById.get(authorId) : undefined;
                  const voters = o.votes.map((id) => nameById.get(id) ?? "???").join(", ");
                  const likers = (o.likes || []).map((id) => nameById.get(id) ?? "???").join(", ");

                  return (
                    <div key={o.id} className={`listItem reveal-option ${isReal ? "is-real" : ""}`}>
                      <div>
                        <div className="name">
                          {o.text}
                          {isReal ? (
                            <span className="tag real">CORRECT</span>
                          ) : (
                            <span className="tag fake" style={{ backgroundColor: authorColor + '22', color: authorColor }}>
                              fake by {authorName}
                            </span>
                          )}
                          {o.likes && o.likes.length > 0 && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: "rgba(239, 68, 68, 0.2)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                padding: "2px 6px",
                                borderRadius: "999px"
                              }}
                            >
                              😂 {o.likes.length} {o.likes.length === 1 ? "Like" : "Likes"}
                            </span>
                          )}
                        </div>
                        {o.votes.length > 0 && (
                          <div className="muted small" style={{ marginTop: "4px" }}>
                            <b>Voters:</b> {voters}
                          </div>
                        )}
                        {o.likes && o.likes.length > 0 && (
                          <div className="muted small" style={{ marginTop: "2px", color: "#f87171" }}>
                            <b>😂 Liked by:</b> {likers}
                          </div>
                        )}
                      </div>
                      <div className="vote-count">{o.votes.length}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="reveal-sidebar">
            <h3 style={{ marginBottom: "1rem" }}>Scoreboard</h3>
            <div className="list compact">
              {sorted.map((p) => {
                const delta = props.reveal?.pointsDeltaByPlayer[p.id] ?? 0;
                return (
                  <div key={p.id} className="listItem scoreboard-item">
                    <div className="row" style={{ gap: "8px" }}>
                      {p.avatarUrl && <img src={p.avatarUrl} alt="av" className="avatar-tiny" style={{ border: `1px solid ${p.color}` }} />}
                      <div className="name" style={{ color: p.color, fontSize: "0.9rem" }}>{p.name}</div>
                    </div>
                    <div className="scoreLine">
                      {delta !== 0 && (
                        <span className={delta > 0 ? "delta plus" : "delta minus"}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                      <span className="score">{p.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

