import React, { useEffect, useState } from "react";
import type { RoomState } from "../../types";

import logoUrl from "../../../media/logo-transparent.png";

export function Sidebar(props: { room: RoomState; meId: string; onStop?: () => void; onLeave?: () => void }) {
  const { room, meId } = props;
  const isHost = room.hostId === meId;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!room.endTime) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((room.endTime! - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [room.endTime]);

  const getStatus = (pId: string) => {
    if (room.phase === "lobby") return "";
    if (room.phase === "draw") {
      return room.drawing?.submittedBy.includes(pId) ? "Done" : "Drawing...";
    }
    if (room.phase === "submit") {
      if (room.submit?.drawerId === pId) return "Drawing";
      return room.submit?.submittedBy.includes(pId) ? "Done" : "Typing...";
    }
    if (room.phase === "vote") {
      if (room.vote?.drawerId === pId) return "Drawing";
      return room.vote?.votedBy.includes(pId) ? "Voted" : "Thinking...";
    }
    if (room.phase === "category") {
      return room.fakeArtist?.questionMasterId === pId ? "Choosing..." : "Waiting...";
    }
    if (room.phase === "draw_shared") {
      if (room.fakeArtist?.questionMasterId === pId) return "Watching";
      return room.fakeArtist?.activePlayerId === pId ? "Drawing!" : "Waiting...";
    }
    if (room.phase === "accuse") {
      if (room.fakeArtist?.questionMasterId === pId) return "Watching";
      return room.fakeArtist?.votedForId?.[pId] ? "Voted" : "Accusing...";
    }
    if (room.phase === "guess") {
      return room.fakeArtist?.fakeArtistId === pId ? "Guessing..." : "Watching";
    }
    return "";
  };

  return (
    <div className="sidebar">
      <div style={{ 
        textAlign: "center", 
        marginBottom: "20px", 
        background: "rgba(255, 255, 255, 0.12)", 
        borderRadius: "20px", 
        padding: "16px",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)"
      }}>
        <img src={logoUrl} alt="TeaDraw Logo" style={{ maxWidth: "240px", width: "100%" }} />
      </div>
      <div className="sidebar-actions" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={() => {
            if (window.confirm("Leave this room?")) {
              props.onLeave?.();
            }
          }}
        >
          Leave
        </button>
        {isHost && room.phase !== "lobby" && (
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => {
              if (window.confirm("Stop the current game and return to lobby?")) {
                props.onStop?.();
              }
            }}
          >
            Stop
          </button>
        )}
      </div>

      <div className="sidebar-header">
        <div>
          <h3 style={{ marginBottom: "2px" }}>Game Status</h3>
          {room.phase !== "lobby" && room.phase !== "game_over" && (
            <div className="muted small">Round {room.round} / {room.totalRounds}</div>
          )}
        </div>
        {timeLeft !== null && (
          <div className={`timer ${timeLeft <= 5 ? "urgent" : ""}`}>
            {timeLeft}s
          </div>
        )}
      </div>

      <div className="sidebar-players" style={{ flex: 1, overflowY: "auto" }}>
        {room.players.map((p) => {
          const status = getStatus(p.id);
          const isDone = status === "Done" || status === "Voted";
          return (
            <div key={p.id} className={`sidebar-player ${p.id === meId ? "me" : ""} ${!p.connected ? "offline" : ""}`}>
              <div className="sp-info">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {p.avatarUrl && (
                    <img
                      src={p.avatarUrl}
                      alt="avatar"
                      style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#fff", border: `2px solid ${p.color}` }}
                    />
                  )}
                  <span className="sp-name" style={{ color: p.color }}>{p.name}</span>
                </div>
                <span className="sp-score">{p.score} pts</span>
              </div>
              <div className={`sp-status ${isDone ? "done" : ""}`}>
                {status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
