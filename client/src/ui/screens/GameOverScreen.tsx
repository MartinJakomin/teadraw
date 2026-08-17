import React, { useEffect } from "react";
import type { RoomState } from "../../types";
import confetti from "canvas-confetti";
import { downloadImageDataUrl } from "../downloadImage";

export function GameOverScreen(props: {
  room: RoomState;
  me?: RoomState["players"][number];
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}) {
  useEffect(() => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#6366f1", "#8b5cf6", "#d946ef", "#fbbf24", "#10b981"]
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#6366f1", "#8b5cf6", "#d946ef", "#fbbf24", "#10b981"]
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const sorted = [...props.room.players].sort((a, b) => b.score - a.score);
  const podium = sorted.slice(0, 3);
  const others = sorted.slice(3);

  return (
    <div className="page">
      <div className="card">
        <div className="row space" style={{ marginBottom: "2rem" }}>
          <div>
            <h1 style={{ margin: 0 }}>Game Over</h1>
          </div>
          <button className="btn" onClick={props.onLeave}>
            Leave game
          </button>
        </div>

        <div className="podium">
          {podium[1] && (
            <div className="podium-spot spot-2">
              <div className="podium-avatar-wrap">
                {podium[1].avatarUrl && <img src={podium[1].avatarUrl} alt="2nd" className="podium-avatar" style={{ border: `4px solid ${podium[1].color}` }} />}
                <div className="podium-rank">2</div>
              </div>
              <div className="podium-name" style={{ color: podium[1].color }}>{podium[1].name}</div>
              <div className="podium-score">{podium[1].score} pts</div>
            </div>
          )}
          {podium[0] && (
            <div className="podium-spot spot-1">
              <div className="podium-avatar-wrap">
                <div className="crown">👑</div>
                {podium[0].avatarUrl && <img src={podium[0].avatarUrl} alt="1st" className="podium-avatar" style={{ border: `6px solid ${podium[0].color}` }} />}
                <div className="podium-rank">1</div>
              </div>
              <div className="podium-name" style={{ color: podium[0].color }}>{podium[0].name}</div>
              <div className="podium-score">{podium[0].score} pts</div>
            </div>
          )}
          {podium[2] && (
            <div className="podium-spot spot-3">
              <div className="podium-avatar-wrap">
                {podium[2].avatarUrl && <img src={podium[2].avatarUrl} alt="3rd" className="podium-avatar" style={{ border: `4px solid ${podium[2].color}` }} />}
                <div className="podium-rank">3</div>
              </div>
              <div className="podium-name" style={{ color: podium[2].color }}>{podium[2].name}</div>
              <div className="podium-score">{podium[2].score} pts</div>
            </div>
          )}
        </div>

        {others.length > 0 && (
          <>
            <h3 style={{ marginTop: "2rem" }}>Other players</h3>
            <div className="list">
              {others.map((p, idx) => (
                <div key={p.id} className="listItem">
                  <div className="row" style={{ gap: "12px" }}>
                    <div className="rank">#{idx + 4}</div>
                    {p.avatarUrl && <img src={p.avatarUrl} alt="avatar" className="avatar-small" style={{ border: `2px solid ${p.color}` }} />}
                    <div className="name" style={{ color: p.color }}>{p.name}</div>
                  </div>
                  <div className="score">{p.score}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {props.room.accolades && props.room.accolades.length > 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>🏅 Accolades</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              {props.room.accolades.map((a, i) => (
                <div
                  key={i}
                  className="scale-in"
                  style={{
                    padding: "16px",
                    borderRadius: "18px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${a.playerColor}44`,
                    boxShadow: `0 4px 20px ${a.playerColor}22`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ fontSize: "2rem" }}>{a.icon}</div>
                  <div style={{ fontWeight: 900, color: "#fff", fontSize: "1rem", letterSpacing: "0.02em" }}>{a.title}</div>
                  <div style={{ fontWeight: 700, color: a.playerColor, fontSize: "0.95rem" }}>{a.playerName}</div>
                  <div className="muted small">{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {props.room.gallery && props.room.gallery.length > 0 && (
          <div style={{ marginTop: "2.5rem" }}>
            <div className="row space" style={{ marginBottom: "1rem" }}>
              <h3>🖼️ Match Gallery</h3>
              <button
                className="btn"
                onClick={() => {
                  props.room.gallery?.forEach((item, idx) => {
                    setTimeout(() => {
                      const filename = `teadraw-${item.drawerName.replace(/\s+/g, '_')}-${idx + 1}.png`;
                      downloadImageDataUrl(item.imageDataUrl, filename);
                    }, idx * 300);
                  });
                }}
              >
                📥 Download All Drawings
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {props.room.gallery.map((g, i) => (
                <div
                  key={i}
                  className="listItem"
                  style={{
                    flexDirection: "column",
                    alignItems: "stretch",
                    padding: "16px",
                    gap: "12px",
                    background: "rgba(8, 12, 22, 0.4)"
                  }}
                >
                  <img
                    src={g.imageDataUrl}
                    alt={g.prompt}
                    style={{
                      width: "100%",
                      borderRadius: "14px",
                      background: "#fff",
                      border: `3px solid ${g.drawerColor}`
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: g.drawerColor, fontSize: "0.95rem" }}>{g.drawerName}</div>
                      <div className="muted small" style={{ fontStyle: "italic" }}>"{g.prompt}"</div>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                      onClick={() => {
                        const filename = `teadraw-${g.drawerName.replace(/\s+/g, '_')}-${i + 1}.png`;
                        downloadImageDataUrl(g.imageDataUrl, filename);
                      }}
                    >
                      💾 Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="divider" />

        <div className="row center" style={{ marginTop: "1rem" }}>
          {props.isHost && !props.me?.isSpectator ? (
            <button className="btn primary" onClick={props.onRestart}>
              Play again
            </button>
          ) : (
            <div className="muted">Waiting for host to start a new game…</div>
          )}
        </div>
      </div>
    </div>
  );
}
