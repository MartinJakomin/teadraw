import React, { useMemo } from "react";
import type { Reveal, RoomState } from "../../types";

export function RevealScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  reveal: Reveal;
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

  const drawer = props.room.players.find(p => p.id === props.reveal.drawerId);
  const drawerName = drawer?.name ?? "Someone";
  const drawerAvatar = drawer?.avatarUrl;
  const drawerColor = drawer?.color ?? "#000";

  const isChaos = Boolean(props.room.finalChaosRound && props.room.round > props.room.totalRounds);
  const sorted = [...props.room.players].sort((a, b) => b.score - a.score);

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
          <div className="row" style={{ gap: "12px" }}>
            {!isChaos && drawerAvatar && (
              <img
                src={drawerAvatar}
                alt="drawer"
                className="drawer-avatar-reveal"
                style={{ border: `3px solid ${drawerColor}` }}
              />
            )}
            <div>
              <h2 style={{ margin: 0 }}>{isChaos ? "🔥 Chaos Reveal" : "Reveal"}</h2>
              <div className="muted">
                {isChaos
                  ? `Drawing ${props.reveal.drawingIndex + 1} of ${props.reveal.totalDrawings}`
                  : `Drawing ${props.reveal.drawingIndex + 1} of ${props.reveal.totalDrawings} by `}
                {!isChaos && <b style={{ color: drawerColor }}>{drawerName}</b>}
              </div>
            </div>
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

            {isChaos ? (
              <div
                className="scale-in"
                style={{
                  margin: "1.2rem 0",
                  padding: "16px 22px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(239, 68, 68, 0.25))",
                  border: "2px solid rgba(249, 115, 22, 0.55)",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  boxShadow: "0 8px 25px rgba(249, 115, 22, 0.25)"
                }}
              >
                {drawer?.avatarUrl ? (
                  <img
                    src={drawer.avatarUrl}
                    alt={drawer.name}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      border: `3px solid ${drawer.color}`,
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: drawer?.color ?? "#f97316",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.6rem",
                      fontWeight: 900,
                      color: "#fff"
                    }}
                  >
                    {drawer?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#fed7aa", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    🔥 The Artist Was
                  </div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: drawer?.color }}>
                    {drawer?.name}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "2px" }}>
                    Prompt: <b style={{ color: "#fef08a" }}>"{props.reveal.prompt}"</b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prompt reveal-prompt">
                <div className="muted">The real prompt was</div>
                <div className="promptText">{props.reveal.prompt}</div>
              </div>
            )}

            <div className="votes-section">
              <h3 style={{ marginBottom: "1rem" }}>{isChaos ? "Player Guesses & Scoring" : "Votes & Comedy Awards"}</h3>
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
                            <span className="tag real">{isChaos ? "ARTIST (CORRECT! +3 pts)" : "CORRECT"}</span>
                          ) : (
                            <span className="tag fake" style={{ backgroundColor: authorColor + '22', color: authorColor }}>
                              {isChaos ? `fooled (+1 pt bluff to ${o.text})` : `fake by ${authorName}`}
                            </span>
                          )}
                          {!isChaos && o.likes && o.likes.length > 0 && (
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
                            <b>{isChaos ? "Guessed by:" : "Voters:"}</b> {voters}
                          </div>
                        )}
                        {!isChaos && o.likes && o.likes.length > 0 && (
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
                const delta = props.reveal.pointsDeltaByPlayer[p.id] ?? 0;
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
