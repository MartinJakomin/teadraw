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

  const sorted = [...props.room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="page">
      <div className="card reveal-card">
        <div className="row space" style={{ marginBottom: "1.5rem" }}>
          <div className="row" style={{ gap: "12px" }}>
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
                Drawing by <b style={{ color: drawerColor }}>{drawerName}</b>
              </div>
            </div>
          </div>
          {props.isHost ? (
            <button className="btn primary" onClick={props.onNext}>
              {props.reveal.drawingIndex >= props.reveal.totalDrawings - 1 && props.room.round >= props.room.totalRounds ? "Finish Game" : (props.reveal.drawingIndex >= props.reveal.totalDrawings - 1 ? "Next Round" : "Next drawing")}
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
              <h3 style={{ marginBottom: "1rem" }}>Votes</h3>
              <div className="list">
                {props.reveal.options.map((o) => {
                  const authorId = o.authorId;
                  const isReal = !authorId;
                  const authorName = authorId === "system" ? "System" : (authorId ? nameById.get(authorId) : null);
                  const authorColor = authorId ? colorById.get(authorId) : null;
                  const voters = o.votes.map((id) => nameById.get(id) ?? "???").join(", ");

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
                        </div>
                        {o.votes.length > 0 && (
                          <div className="muted small" style={{ marginTop: "4px" }}>
                            <b>Voters:</b> {voters}
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
