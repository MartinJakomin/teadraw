import React, { useEffect, useMemo, useState } from "react";
import type { RoomState } from "../../types";
import { CanvasPad } from "../components/CanvasPad";

export function DrawScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  prompt: string;
  trick?: import("../../types").TrickType;
  onSubmit: (dataUrl: string) => void;
}) {
  const alreadySubmitted = useMemo(
    () => props.room.drawing?.submittedBy.includes(props.me.id) ?? false,
    [props.me.id, props.room.drawing?.submittedBy]
  );
  const spectating = Boolean(props.me.isSpectator);

  // Stable 20-second fixed countdown when Speed Rush trick is active
  const [speedRushEndTime] = useState<number>(() => Date.now() + 20_000);

  const trickInfo = useMemo(() => {
    if (!props.trick) return null;
    switch (props.trick) {
      case "blind":
        return { icon: "🙈", title: "Blind Drawing", desc: "Your strokes are hidden on your screen while drawing!" };
      case "one_stroke":
        return { icon: "✏️", title: "One Stroke Only", desc: "You only get 1 single stroke! Lifts lock your drawing." };
      case "large_brush":
        return { icon: "🖌️", title: "Mega Brush", desc: "Locked to extra thick brush strokes (35px)!" };
      case "tiny_brush":
        return { icon: "🔍", title: "Needle Brush", desc: "Locked to extra thin brush strokes (3px)!" };
      case "half_time":
        return { icon: "⚡", title: "Speed Rush", desc: "Fixed 20-second rush! Hurry up and draw before time runs out!" };
      case "upside_down":
        return { icon: "🙃", title: "Inverted Controls", desc: "Inverted drawing! Moving up draws down, and left draws right!" };
      case "wobble":
        return { icon: "〰️", title: "Earthquake Wobble", desc: "Extreme shakiness! Your brush has chaotic earthquake tremors!" };
      case "mirror":
        return { icon: "🪞", title: "Mirror Symmetry", desc: "Horizontal symmetry! Every stroke is mirrored on both sides!" };
      case "ink_limit":
        return { icon: "🖋️", title: "Ink Budget", desc: "You only have 2,000px of ink! Budget your strokes carefully!" };
      default:
        return null;
    }
  }, [props.trick]);

  const effectiveEndTime = useMemo(() => {
    if (props.trick !== "half_time") return props.room.endTime;
    // Speed Rush: 20 seconds fixed, or sooner if room timer is earlier
    if (props.room.endTime) return Math.min(speedRushEndTime, props.room.endTime);
    return speedRushEndTime;
  }, [props.trick, props.room.endTime, speedRushEndTime]);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!effectiveEndTime) {
      setRemainingSeconds(null);
      return;
    }
    const update = () => {
      const rem = Math.max(0, Math.ceil((effectiveEndTime - Date.now()) / 1000));
      setRemainingSeconds(rem);
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [effectiveEndTime]);

  const isChaos = Boolean(props.room.finalChaosRound && props.room.round > props.room.totalRounds);
  const [showChaosSplash, setShowChaosSplash] = useState(isChaos);

  useEffect(() => {
    if (isChaos) {
      setShowChaosSplash(true);
    }
  }, [isChaos, props.room.round]);

  return (
    <div className="page">
      {showChaosSplash && (
        <div className="chaos-splash-overlay" onClick={() => setShowChaosSplash(false)}>
          <div className="chaos-splash-card scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="chaos-fire-icon">🔥</div>
            <h1 className="chaos-splash-title">FINAL CHAOS ROUND</h1>
            <div className="chaos-splash-tag">ONE SECRET PROMPT • WHO DREW WHAT?</div>
            <div className="chaos-splash-rules">
              <div className="chaos-rule-item">
                <span className="chaos-rule-icon">🎨</span>
                <div>
                  <b>Same Secret Prompt</b>
                  <p>Every single player is drawing the exact same prompt right now!</p>
                </div>
              </div>
              <div className="chaos-rule-item">
                <span className="chaos-rule-icon">🕶️</span>
                <div>
                  <b>Unified Black Ink</b>
                  <p>Everyone is given the exact same ink palette to conceal your identity!</p>
                </div>
              </div>
              <div className="chaos-rule-item">
                <span className="chaos-rule-icon">🕵️</span>
                <div>
                  <b>Guess the Artist</b>
                  <p>Clue writing is skipped! In voting, everyone tries to guess who drew which drawing.</p>
                </div>
              </div>
              <div className="chaos-rule-item">
                <span className="chaos-rule-icon">🏆</span>
                <div>
                  <b>Chaos Scoring</b>
                  <p>+3 pts for identifying the artist, +2 pts to the artist per person who recognizes their art!</p>
                </div>
              </div>
            </div>
            <button className="btn primary chaos-start-btn" onClick={() => setShowChaosSplash(false)}>
              Ready to Draw! 🔥
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row space">
          <div>
            <h2 style={{ margin: 0 }}>{isChaos ? "🔥 Final Chaos Round: Draw" : "Draw"}</h2>
            <div className="muted" style={{ marginTop: "6px" }}>
              {isChaos
                ? "🔥 Everyone has the EXACT same secret prompt and black ink! Draw your best rendition!"
                : "Everyone draws their own prompt at the same time."}
            </div>
          </div>
          {remainingSeconds !== null && !spectating && !alreadySubmitted && (
            <div className={`trick-timer-pill ${remainingSeconds <= 5 ? "urgent" : ""}`}>
              <span>⏱️</span>
              <span>{remainingSeconds}s</span>
            </div>
          )}
        </div>

        {/* Trick Announcement Banner on Canvas */}
        {trickInfo && !spectating && !alreadySubmitted && (
          <div
            className="scale-in"
            style={{
              margin: "1rem 0",
              padding: "12px 20px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25))",
              border: "1px solid rgba(236, 72, 153, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              boxShadow: "0 6px 20px rgba(236, 72, 153, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "1.8rem" }}>{trickInfo.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                  ⚡ Random Trick: {trickInfo.title}
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>
                  {trickInfo.desc}
                </div>
              </div>
            </div>
            {props.trick === "half_time" && remainingSeconds !== null && (
              <div className="trick-timer-pill" style={{ flexShrink: 0 }}>
                <span>⏳</span>
                <span>{remainingSeconds}s</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }} />

        {spectating ? (
          <div className="muted" style={{ marginBottom: "1rem" }}>
            Spectating — secret prompts are not shown to spectators. Follow who has finished in the sidebar.
          </div>
        ) : (
          <div className="prompt">
            <div className="muted">Your prompt</div>
            <div className="promptText">{props.prompt || "Waiting for prompt…"}</div>
          </div>
        )}

        {spectating ? (
          <div className="muted">You cannot submit a drawing while spectating.</div>
        ) : alreadySubmitted ? (
          <div className="muted">Submitted. Waiting for others…</div>
        ) : (
          <CanvasPad
            playerId={props.me.id}
            initialColor={isChaos ? "#000000" : props.me.color}
            allowedColor={isChaos ? "#000000" : props.me.color}
            showShades={true}
            endTime={effectiveEndTime}
            trick={props.trick}
            onSubmit={(url) => {
              if (!url) return;
              props.onSubmit(url);
            }}
          />
        )}
      </div>
    </div>
  );
}
