import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Reveal, RoomState, StrokeEvent, TrickType } from "../../types";
import { TrickBadge } from "../components/TrickBadge";

function StrokeReplayDisplay(props: {
  imageDataUrl: string;
  strokeLog?: StrokeEvent[];
  trick?: TrickType;
  enableReplay: boolean;
  imgClassName?: string;
}) {
  const hasStrokes = Boolean(props.enableReplay && props.strokeLog && props.strokeLog.length > 0);
  const [isReplaying, setIsReplaying] = useState(hasStrokes);
  const [replayRunId, setReplayRunId] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const shouldPlay = Boolean(props.enableReplay && props.strokeLog && props.strokeLog.length > 0);
    setIsReplaying(shouldPlay);
    if (shouldPlay) setReplayRunId((r) => r + 1);
  }, [props.imageDataUrl, props.enableReplay, props.strokeLog]);

  useEffect(() => {
    if (!isReplaying || !props.strokeLog || props.strokeLog.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const strokes = props.strokeLog;
    const totalPoints = strokes.reduce((acc, s) => acc + Math.max(1, s.points.length), 0);
    const durationMs = Math.min(3600, Math.max(1400, totalPoints * 12));
    const startTime = performance.now();
    let rafId = 0;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const targetPoints = Math.max(1, Math.floor(progress * totalPoints));

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let drawnPoints = 0;
      for (const s of strokes) {
        if (drawnPoints >= targetPoints) break;
        const pts = s.points;
        if (pts.length === 0) continue;

        const takeCount = Math.min(pts.length, targetPoints - drawnPoints);
        drawnPoints += takeCount;

        const colorStr = `rgb(${s.color.r},${s.color.g},${s.color.b})`;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = colorStr;
        ctx.fillStyle = colorStr;
        ctx.lineWidth = s.brushSize;
        ctx.globalAlpha = s.opacity ?? 1;

        if (props.trick === "pixel_art") {
          const gridSize = 32;
          for (let i = 0; i < takeCount; i++) {
            const p = pts[i]!;
            const gx = Math.floor(p.x / gridSize) * gridSize;
            const gy = Math.floor(p.y / gridSize) * gridSize;
            ctx.fillRect(gx, gy, gridSize, gridSize);
          }
        } else if (takeCount === 1) {
          ctx.beginPath();
          ctx.arc(pts[0]!.x, pts[0]!.y, s.brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(pts[0]!.x, pts[0]!.y);
          for (let i = 1; i < takeCount; i++) {
            ctx.lineTo(pts[i]!.x, pts[i]!.y);
          }
          if (props.trick === "cubism" && takeCount === pts.length && pts.length >= 3) {
            ctx.closePath();
            ctx.globalAlpha = (s.opacity ?? 1) * 0.28;
            ctx.fill();
            ctx.globalAlpha = s.opacity ?? 1;
          }
          ctx.stroke();

          if (props.trick === "spiderweb" && takeCount > 4) {
            ctx.lineWidth = Math.max(0.9, s.brushSize * 0.14);
            ctx.globalAlpha = (s.opacity ?? 1) * 0.28;
            ctx.beginPath();
            for (let i = 3; i < takeCount; i += 3) {
              const pt = pts[i]!;
              const linked: Array<{ x: number; y: number }> = [];
              for (let j = i - 5; j >= 0 && linked.length < 6; j -= 4) {
                const prevPt = pts[j]!;
                const d = Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
                if (d >= 18 && d <= 148) {
                  ctx.moveTo(pt.x, pt.y);
                  ctx.lineTo(prevPt.x, prevPt.y);
                  linked.push(prevPt);
                }
              }
              if (linked.length >= 2) {
                for (let k = 0; k < Math.min(linked.length - 1, 3); k++) {
                  const a = linked[k]!;
                  const b = linked[k + 1]!;
                  for (const ratio of [0.38, 0.72]) {
                    ctx.moveTo(pt.x + (a.x - pt.x) * ratio, pt.y + (a.y - pt.y) * ratio);
                    ctx.lineTo(pt.x + (b.x - pt.x) * ratio, pt.y + (b.y - pt.y) * ratio);
                  }
                }
              }
            }
            ctx.stroke();

            // Draw perched & hanging spiders along the replayed web every 14 points
            for (let i = 14; i < takeCount; i += 14) {
              const anchor = pts[i]!;
              const hanging = i % 28 === 0;
              const dropLen = hanging ? 36 + (i % 24) : 0;
              const sx = anchor.x;
              const sy = Math.min(canvas.height - 12, anchor.y + dropLen);
              ctx.save();
              ctx.globalAlpha = 0.92;
              if (hanging) {
                ctx.strokeStyle = "rgba(100, 116, 139, 0.7)";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(anchor.x, anchor.y);
                ctx.lineTo(sx, sy);
                ctx.stroke();
              }
              ctx.strokeStyle = "#1e293b";
              ctx.lineWidth = 1.4;
              for (const side of [-1, 1]) {
                for (let leg = 0; leg < 4; leg++) {
                  const spread = (leg - 1.5) * 0.42;
                  ctx.beginPath();
                  ctx.moveTo(sx, sy);
                  ctx.lineTo(sx + side * 6, sy + spread * 5 - 2);
                  ctx.lineTo(sx + side * 10, sy + spread * 9 + 2);
                  ctx.stroke();
                }
              }
              ctx.fillStyle = "#0f172a";
              ctx.beginPath();
              ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#ef4444";
              ctx.beginPath();
              ctx.arc(sx, sy - 1, 1.3, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }
        ctx.restore();
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(renderFrame);
      } else {
        setIsReplaying(false);
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isReplaying, replayRunId, props.strokeLog, props.trick]);

  const cls = props.imgClassName ?? "img reveal-img";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {isReplaying ? (
        <canvas
          ref={canvasRef}
          width={900}
          height={550}
          className={cls}
        />
      ) : (
        <img className={cls} src={props.imageDataUrl} alt="drawing" />
      )}

      {hasStrokes && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (isReplaying) {
              setIsReplaying(false);
            } else {
              setIsReplaying(true);
              setReplayRunId((r) => r + 1);
            }
          }}
          style={{
            position: "absolute",
            bottom: "10px",
            right: "14px",
            padding: "5px 12px",
            fontSize: "0.76rem",
            fontWeight: 800,
            borderRadius: "999px",
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(168, 85, 247, 0.55)",
            color: "#e9d5ff",
            backdropFilter: "blur(6px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)"
          }}
          title={isReplaying ? "Skip to final image" : "Watch time-lapse stroke replay"}
        >
          {isReplaying ? "⏭️ Show Final" : "🎬 Replay Strokes"}
        </button>
      )}
    </div>
  );
}

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

  const [revealTimeLeft, setRevealTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!props.room.endTime) {
      setRevealTimeLeft(null);
      return;
    }
    const update = () => {
      const rem = Math.max(0, Math.ceil((props.room.endTime! - Date.now()) / 1000));
      setRevealTimeLeft(rem);
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [props.room.endTime, props.reveal?.drawingIndex, props.room.round]);

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
                Finish Game 🏆{revealTimeLeft !== null ? ` (${revealTimeLeft}s)` : ""}
              </button>
            ) : (
              <div className="muted">
                {revealTimeLeft !== null ? `⏱️ Auto-finishing in ${revealTimeLeft}s…` : "Waiting for host to continue…"}
              </div>
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

                    <StrokeReplayDisplay
                      imageDataUrl={d.imageDataUrl}
                      strokeLog={d.strokeLog}
                      enableReplay={props.room.enableStrokeReplay !== false}
                      imgClassName="chaos-drawing-img"
                    />

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
        <div className="row space" style={{ marginBottom: "0.6rem" }}>
          <div className="row" style={{ gap: "10px", flexWrap: "wrap" }}>
            {drawerAvatar && (
              <img
                src={drawerAvatar}
                alt="drawer"
                className="drawer-avatar-reveal"
                style={{ border: `2.5px solid ${drawerColor}` }}
              />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 2vw, 1.6rem)" }}>Reveal</h2>
              <div className="muted small">
                Drawing {props.reveal.drawingIndex + 1} of {props.reveal.totalDrawings} by <b style={{ color: drawerColor }}>{drawerName}</b>
              </div>
            </div>
            {props.reveal.trick && <TrickBadge trick={props.reveal.trick} />}
          </div>
          {props.isHost && !props.me.isSpectator ? (
            <button className="btn primary" onClick={props.onNext}>
              {nextButtonLabel}{revealTimeLeft !== null ? ` (${revealTimeLeft}s)` : ""}
            </button>
          ) : (
            <div className="muted small">
              {revealTimeLeft !== null ? `⏱️ Next in ${revealTimeLeft}s…` : "Waiting for host…"}
            </div>
          )}
        </div>

        <div className="reveal-content">
          <div className="reveal-main">
            <StrokeReplayDisplay
              imageDataUrl={props.reveal.imageDataUrl}
              strokeLog={props.reveal.strokeLog}
              trick={props.reveal.trick}
              enableReplay={props.room.enableStrokeReplay !== false}
            />

            <div className="prompt reveal-prompt" style={{ margin: "clamp(0.25rem, 0.6vh, 0.5rem) 0", padding: "6px 14px" }}>
              <div className="muted small">The real prompt was</div>
              <div className="promptText" style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)" }}>{props.reveal.prompt}</div>
            </div>

            <div className="votes-section">
              <h3 style={{ marginBottom: "0.4rem", fontSize: "1.05rem" }}>Votes & Comedy Awards</h3>
              <div className="list" style={props.reveal.options.length > 4 ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" } : undefined}>
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

