import React, { useMemo, useState } from "react";
import type { RoomState } from "../../types";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";

function drawfulVoteParticipants(room: RoomState, drawerId: string) {
  return room.players.filter((p) => p.id !== drawerId && !p.isSpectator).length;
}

export function VoteScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  vote: NonNullable<RoomState["vote"]>;
  onVote: (optionId: string, likedOptionIds?: string[]) => void;
}) {
  const isChaos = Boolean(props.room.finalChaosRound && props.room.round > props.room.totalRounds);
  const isDrawer = props.vote.drawerId === props.me.id;
  const already = useMemo(() => props.vote.votedBy.includes(props.me.id), [props.me.id, props.vote.votedBy]);
  const [picked, setPicked] = useState<string>("");
  const [likedIds, setLikedIds] = useState<string[]>([]);

  const drawer = props.room.players.find((p) => p.id === props.vote.drawerId);
  const drawerName = drawer?.name ?? "Someone";
  const spectating = Boolean(props.me.isSpectator);
  const stripIds = props.room.drawingPlayerOrder ?? [];
  const expectedVotes = drawfulVoteParticipants(props.room, props.vote.drawerId);

  const handleVote = (optionId: string) => {
    setPicked(optionId);
    props.onVote(optionId, likedIds);
  };

  const handleToggleLike = (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    const next = likedIds.includes(optionId)
      ? likedIds.filter((id) => id !== optionId)
      : [...likedIds, optionId];
    setLikedIds(next);
    if (picked) {
      props.onVote(picked, next);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2>{isChaos ? "🔥 Chaos Round: Who drew this?" : "Vote"}</h2>
            <div className="muted" style={{ marginTop: "8px" }}>
              {isChaos
                ? "Everyone drew the exact same prompt! Guess who drew this one!"
                : "Which prompt is the real one? Tap 😂 to award a Comedy Like to your favorite lie!"}
            </div>
          </div>
        </div>

        {!isChaos && (
          <div className="drawer-info" style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1.2rem 0" }}>
            {drawer?.avatarUrl && (
              <img src={drawer.avatarUrl} alt="drawer" className="avatar-small" style={{ border: `2px solid ${drawer.color}` }} />
            )}
            <div className="muted">
              Drawing by <b style={{ color: drawer?.color }}>{drawerName}</b>
            </div>
          </div>
        )}

        {isChaos && props.vote.prompt && (
          <div
            style={{
              margin: "1rem 0",
              padding: "10px 16px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))",
              border: "1px solid rgba(249, 115, 22, 0.4)",
              color: "#fff",
              textAlign: "center",
              fontSize: "1rem",
              fontWeight: 700
            }}
          >
            🔥 Shared Prompt: <b style={{ color: "#fef08a" }}>"{props.vote.prompt}"</b>
          </div>
        )}

        <img className="img" src={props.vote.imageDataUrl} alt="drawing" />

        {spectating ? (
          <div className="muted" style={{ marginTop: "1rem" }}>
            You are spectating — you cannot vote.
          </div>
        ) : isDrawer ? (
          <div
            style={{
              margin: "1rem 0",
              padding: "12px 18px",
              borderRadius: "14px",
              background: "rgba(249, 115, 22, 0.15)",
              border: "1px solid rgba(249, 115, 22, 0.4)",
              color: "#fed7aa",
              fontWeight: 700,
              textAlign: "center"
            }}
          >
            🕵️ This is your drawing! Waiting for other players to guess that you drew it…
          </div>
        ) : null}
        {!spectating && !isDrawer && already ? (
          <div className="muted" style={{ textAlign: "center", margin: "1rem 0" }}>
            ✅ Guess submitted! Waiting for other players…
          </div>
        ) : null}

        <div className="grid">
          {props.vote.options.map((o) => {
            const isMyClue = isChaos ? o.id === props.me.id : o.text === localStorage.getItem("teadraw:myClue");
            const isLiked = likedIds.includes(o.id);
            const playerOption = isChaos ? props.room.players.find((p) => p.id === o.id) : null;

            if (isChaos && playerOption) {
              return (
                <div
                  key={o.id}
                  className={`chaos-player-card ${picked === o.id ? "picked" : ""} ${isMyClue ? "disabled-clue" : ""}`}
                  style={{
                    cursor: (spectating || isDrawer || isMyClue) ? "default" : "pointer",
                    opacity: isMyClue ? 0.6 : 1
                  }}
                  onClick={() => {
                    if (spectating || isDrawer || isMyClue) return;
                    handleVote(o.id);
                  }}
                >
                  {playerOption.avatarUrl ? (
                    <img
                      src={playerOption.avatarUrl}
                      alt={playerOption.name}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        border: `3px solid ${playerOption.color}`,
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: playerOption.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        color: "#fff",
                        fontSize: "1.2rem"
                      }}
                    >
                      {playerOption.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: playerOption.color }}>
                      {playerOption.name}
                    </span>
                    {isMyClue && <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>You (cannot vote for self)</span>}
                    {picked === o.id && <span style={{ fontSize: "0.75rem", color: "#f97316", fontWeight: 700 }}>Your Pick ✓</span>}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={o.id}
                className={`option vote-option ${picked === o.id ? "picked" : ""} ${isMyClue ? "disabled-clue" : ""}`}
                style={{ position: "relative", cursor: (spectating || isDrawer || isMyClue) ? "default" : "pointer" }}
                onClick={() => {
                  if (spectating || isDrawer || isMyClue) return;
                  handleVote(o.id);
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, paddingRight: isMyClue || isChaos ? 0 : "36px" }}>
                  <span className="vote-option-text">{o.text}</span>
                  {isMyClue && <span className="vote-option-subtext">{isChaos ? "you" : "your lie"}</span>}
                </div>

                {!isChaos && !isMyClue && !spectating && (
                  <button
                    type="button"
                    title="Award Comedy Like"
                    onClick={(e) => handleToggleLike(e, o.id)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: isLiked ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.08)",
                      border: isLiked ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "999px",
                      padding: "4px 8px",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>😂</span>
                    {isLiked && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f87171" }}>Liked!</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          {!isChaos && (
            <PlayerOrderStrip
              players={props.room.players}
              orderedPlayerIds={stripIds}
              activePlayerId={props.vote.drawerId}
            />
          )}
          <div className="muted small" style={{ marginTop: "10px", textAlign: "center" }}>
            Drawing {props.vote.drawingIndex + 1} of {props.vote.totalDrawings}
          </div>
          <div className="muted small" style={{ marginTop: "4px", textAlign: "center" }}>
            Voted: {props.vote.votedBy.length}/{expectedVotes}
          </div>
        </div>
      </div>
    </div>
  );
}
