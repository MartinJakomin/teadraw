import React, { useMemo, useState, useEffect, useRef } from "react";
import type { RoomState } from "../../types";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";
import { TrickBadge } from "../components/TrickBadge";

function drawfulVoteParticipants(room: RoomState, drawerId: string) {
  return room.players.filter((p) => p.id !== drawerId && !p.isSpectator).length;
}

export function VoteScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  vote?: RoomState["vote"];
  chaosVote?: RoomState["chaosVote"];
  onVote: (optionId: string, likedOptionIds?: string[]) => void;
  onChaosVote?: (votes: Record<string, string>) => void;
}) {
  const isChaos = Boolean(props.room.finalChaosRound && props.room.round > props.room.totalRounds);
  const spectating = Boolean(props.me.isSpectator);

  // Normal vote state
  const isDrawer = props.vote?.drawerId === props.me.id;
  const alreadyNormal = useMemo(() => props.vote?.votedBy.includes(props.me.id) ?? false, [props.me.id, props.vote?.votedBy]);
  const [picked, setPicked] = useState<string>("");
  const [likedIds, setLikedIds] = useState<string[]>([]);

  // Chaos vote state
  const chaosDrawings = useMemo(() => {
    if (!props.room.chaosVote) return [];
    if (spectating) return props.room.chaosVote.drawings;
    return props.room.chaosVote.drawings.filter((d) => d.drawerId !== props.me.id);
  }, [props.room.chaosVote, spectating, props.me.id]);

  const eligibleChaosArtists = useMemo(() => {
    return props.room.players.filter((p) => !p.isSpectator && (spectating || p.id !== props.me.id));
  }, [props.room.players, spectating, props.me.id]);

  const alreadyChaos = useMemo(() => {
    return props.room.chaosVote?.votedBy.includes(props.me.id) ?? false;
  }, [props.me.id, props.room.chaosVote?.votedBy]);

  const [chaosPicks, setChaosPicks] = useState<Record<string, string>>({});
  const [submittingChaos, setSubmittingChaos] = useState(false);

  const handleNormalVote = (optionId: string) => {
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

  const handlePickChaosArtist = (drawingId: string, artistId: string) => {
    if (spectating || alreadyChaos || submittingChaos) return;
    setChaosPicks((prev) => ({ ...prev, [drawingId]: artistId }));
  };

  const submitChaosVotes = () => {
    if (spectating || alreadyChaos || submittingChaos || !props.onChaosVote) return;
    setSubmittingChaos(true);
    props.onChaosVote(chaosPicks);
  };

  // Auto-submit Chaos votes when timer expires
  const hasAutoSubmittedChaosRef = useRef(false);
  useEffect(() => {
    if (!isChaos || !props.room.endTime || hasAutoSubmittedChaosRef.current || alreadyChaos || spectating) return;
    const check = setInterval(() => {
      const remaining = props.room.endTime! - Date.now();
      if (remaining <= 0 && !hasAutoSubmittedChaosRef.current) {
        hasAutoSubmittedChaosRef.current = true;
        clearInterval(check);
        // Fill any unpicked drawing with a random pick
        const finalPicks: Record<string, string> = { ...chaosPicks };
        for (const d of chaosDrawings) {
          if (!finalPicks[d.id] && eligibleChaosArtists.length > 0) {
            const randomPick = eligibleChaosArtists[Math.floor(Math.random() * eligibleChaosArtists.length)]!;
            finalPicks[d.id] = randomPick.id;
          }
        }
        props.onChaosVote?.(finalPicks);
      }
    }, 500);
    return () => clearInterval(check);
  }, [isChaos, props.room.endTime, alreadyChaos, spectating, chaosPicks, chaosDrawings, eligibleChaosArtists, props.onChaosVote]);

  // Render Chaos simultaneous voting
  if (isChaos && props.room.chaosVote) {
    const totalNeeded = chaosDrawings.length;
    const totalPicked = Object.keys(chaosPicks).length;
    const isComplete = totalPicked >= totalNeeded && totalNeeded > 0;
    const totalActiveVoters = props.room.players.filter((p) => !p.isSpectator).length;

    return (
      <div className="page">
        <div className="card">
          <div className="row space">
            <div>
              <h2>🔥 Final Chaos Round: Who Drew What?</h2>
              <div className="muted" style={{ marginTop: "6px" }}>
                Match each drawing to the artist who drew it! All votes are cast simultaneously in secret.
              </div>
            </div>
          </div>

          {props.room.chaosVote.prompt && (
            <div
              style={{
                margin: "1.2rem 0",
                padding: "12px 20px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))",
                border: "1px solid rgba(249, 115, 22, 0.45)",
                color: "#fff",
                textAlign: "center",
                fontSize: "1.1rem",
                fontWeight: 700
              }}
            >
              🔥 Shared Secret Prompt: <b style={{ color: "#fef08a" }}>"{props.room.chaosVote.prompt}"</b>
            </div>
          )}

          {spectating && (
            <div className="muted" style={{ marginBottom: "1rem", textAlign: "center" }}>
              👀 You are spectating — waiting for players to submit their secret guesses.
            </div>
          )}

          <div className="chaos-vote-grid">
            {chaosDrawings.map((drawing, idx) => {
              const currentChoiceId = chaosPicks[drawing.id];
              return (
                <div key={drawing.id} className="chaos-drawing-card">
                  <div className="chaos-card-header">
                    <span className="chaos-drawing-badge">Drawing #{idx + 1}</span>
                    {currentChoiceId ? (
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#10b981" }}>
                        Picked: {props.room.players.find((p) => p.id === currentChoiceId)?.name} ✓
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f59e0b" }}>
                        Pick an artist
                      </span>
                    )}
                  </div>

                  <img src={drawing.imageDataUrl} alt={`Drawing ${idx + 1}`} className="chaos-drawing-img" />

                  {!spectating && (
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.7)", marginBottom: "8px" }}>
                        Who drew this?
                      </div>
                      <div className="chaos-artist-chips">
                        {eligibleChaosArtists.map((artist) => {
                          const isSelected = currentChoiceId === artist.id;
                          return (
                            <button
                              key={artist.id}
                              type="button"
                              disabled={alreadyChaos || submittingChaos}
                              className={`chaos-artist-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => handlePickChaosArtist(drawing.id, artist.id)}
                            >
                              {artist.avatarUrl ? (
                                <img
                                  src={artist.avatarUrl}
                                  alt={artist.name}
                                  style={{ width: "20px", height: "20px", borderRadius: "50%", border: `1.5px solid ${artist.color}` }}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: artist.color,
                                    color: "#fff",
                                    fontSize: "0.7rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900
                                  }}
                                >
                                  {artist.name[0]?.toUpperCase()}
                                </span>
                              )}
                              <span style={{ color: isSelected ? "#fff" : artist.color }}>{artist.name}</span>
                              {isSelected && <span style={{ color: "#f97316", fontWeight: 900 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!spectating && (
            <div className="chaos-status-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                  {alreadyChaos ? "✅ Guesses Locked In" : `Progress: ${totalPicked}/${totalNeeded} Guessed`}
                </span>
                <span className="muted small">
                  ({props.room.chaosVote.votedBy.length}/{totalActiveVoters} players finished)
                </span>
              </div>

              {alreadyChaos ? (
                <div style={{ color: "#fed7aa", fontWeight: 700, fontSize: "0.9rem" }}>
                  Waiting for other players to finish…
                </div>
              ) : (
                <button
                  className="btn primary"
                  disabled={!isComplete || submittingChaos}
                  onClick={submitChaosVotes}
                  style={{
                    padding: "10px 24px",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #f97316, #ef4444)",
                    boxShadow: "0 4px 15px rgba(249, 115, 22, 0.4)"
                  }}
                >
                  {submittingChaos ? "Locking in…" : `Lock In Guesses 🔥 (${totalPicked}/${totalNeeded})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular Drawful single-drawing vote
  const currentVote = props.vote;
  if (!currentVote) return null;

  const drawer = props.room.players.find((p) => p.id === currentVote.drawerId);
  const drawerName = drawer?.name ?? "Someone";
  const stripIds = props.room.drawingPlayerOrder ?? [];
  const expectedVotes = drawfulVoteParticipants(props.room, currentVote.drawerId);

  return (
    <div className="page">
      <div className="card" style={{ padding: "clamp(0.5rem, 1vh, 0.9rem) clamp(0.75rem, 1.2vw, 1.2rem)" }}>
        <div className="row space">
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 1.8vw, 1.45rem)" }}>Vote</h2>
            <div className="muted small" style={{ marginTop: "1px" }}>
              Which prompt is real? Tap 😂 to like your favorite lie!
            </div>
          </div>
        </div>

        <div className="drawer-info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "clamp(0.2rem, 0.4vh, 0.35rem) 0", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {drawer?.avatarUrl && (
              <img src={drawer.avatarUrl} alt="drawer" className="avatar-small" style={{ border: `2px solid ${drawer.color}` }} />
            )}
            <div className="muted" style={{ fontSize: "0.82rem" }}>
              Drawing by <b style={{ color: drawer?.color }}>{drawerName}</b>
            </div>
          </div>
          {currentVote.trick && <TrickBadge trick={currentVote.trick} />}
        </div>

        <img className="img" src={currentVote.imageDataUrl} alt="drawing" style={{ margin: "2px auto" }} />

        {spectating ? (
          <div className="muted small" style={{ marginTop: "0.35rem" }}>
            You are spectating — you cannot vote.
          </div>
        ) : isDrawer ? (
          <div
            style={{
              margin: "0.35rem 0",
              padding: "6px 12px",
              borderRadius: "10px",
              background: "rgba(249, 115, 22, 0.15)",
              border: "1px solid rgba(249, 115, 22, 0.4)",
              color: "#fed7aa",
              fontWeight: 700,
              textAlign: "center",
              fontSize: "0.82rem"
            }}
          >
            🕵️ You drew this! Waiting for others to vote…
          </div>
        ) : alreadyNormal ? (
          <div className="muted small" style={{ textAlign: "center", margin: "0.35rem 0", fontSize: "0.82rem" }}>
            ✅ Vote cast! Waiting for other players…
          </div>
        ) : null}

        <div className="grid" style={{ gap: "6px", marginTop: "clamp(0.3rem, 0.6vh, 0.5rem)" }}>
          {currentVote.options.map((o) => {
            const isMyClue = o.text === localStorage.getItem("teadraw:myClue");
            const isLiked = likedIds.includes(o.id);

            return (
              <div
                key={o.id}
                className={`option vote-option ${picked === o.id ? "picked" : ""} ${isMyClue ? "disabled-clue" : ""}`}
                style={{ position: "relative", cursor: (spectating || isDrawer || isMyClue) ? "default" : "pointer" }}
                onClick={() => {
                  if (spectating || isDrawer || isMyClue) return;
                  handleNormalVote(o.id);
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", flex: 1, paddingRight: isMyClue ? 0 : "28px" }}>
                  <span className="vote-option-text">{o.text}</span>
                  {isMyClue && <span className="vote-option-subtext">your lie</span>}
                </div>

                {!isMyClue && !spectating && (
                  <button
                    type="button"
                    title="Award Comedy Like"
                    onClick={(e) => handleToggleLike(e, o.id)}
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      background: isLiked ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.08)",
                      border: isLiked ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "999px",
                      padding: "2px 5px",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <span>😂</span>
                    {isLiked && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#f87171" }}>Liked!</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "clamp(0.35rem, 0.8vh, 0.6rem)" }}>
          <PlayerOrderStrip
            players={props.room.players}
            orderedPlayerIds={stripIds}
            activePlayerId={currentVote.drawerId}
          />
          <div className="muted small" style={{ marginTop: "3px", textAlign: "center", fontSize: "0.72rem" }}>
            Drawing {currentVote.drawingIndex + 1} of {currentVote.totalDrawings} • Voted: {currentVote.votedBy.length}/{expectedVotes}
          </div>
        </div>
      </div>
    </div>
  );
}

