import React from "react";
import type { RoomState } from "../../types";

export function GameOverScreen(props: {
  room: RoomState;
  me?: RoomState["players"][number];
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}) {
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
