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
      case "random_brush":
        return { icon: "🎲", title: "Brush Roulette", desc: "Locked slider! Brush automatically switches between random sizes as you draw!" };
      case "half_time":
        return { icon: "⚡", title: "Speed Rush", desc: "Fixed 20-second rush! Hurry up and draw before time runs out!" };
      case "upside_down":
        return { icon: "🙃", title: "Inverted Controls", desc: "Inverted drawing! Moving up draws down, and left draws right!" };
      case "wobble":
        return { icon: "〰️", title: "Earthquake Wobble", desc: "Extreme shakiness! Your brush has chaotic earthquake tremors!" };
      case "mirror":
        return { icon: "🪞", title: "Mirror Symmetry", desc: "Horizontal symmetry! Every stroke is mirrored on both sides!" };
      case "ink_limit":
        return { icon: "🖋️", title: "Ink Budget", desc: "You only have 3,000px of ink! Budget your strokes carefully!" };
      case "rubberband":
        return { icon: "🐦", title: "Slingshot Pull & Shoot", desc: "Pull back to aim and release to fire curved ballistic ink shots across the canvas!" };
      case "input_delay":
        return { icon: "⏱️", title: "2s Lag + Vanishing Ink", desc: "Strokes appear 2s late, stay for 2s, and then vanish from your view!" };
      case "spinning":
        return { icon: "🎠", title: "Spinning Canvas", desc: "Dizzy carousel! The canvas continuously spins 360° as you draw!" };
      case "glitch":
        return { icon: "👾", title: "Glitch Teleport", desc: "Cyberpunk glitch! Your brush randomly teleports and jitters around!" };
      case "gravity_drip":
        return { icon: "💧", title: "Gravity Drip", desc: "Wet paint! Drawn points drip and melt downwards like graffiti!" };
      case "pixel_art":
        return { icon: "🧱", title: "8-Bit Pixel Block", desc: "Retro arcade mode! All strokes snap into chunky pixel grid blocks!" };
      case "bubbles":
        return { icon: "🫧", title: "Bubble Stamping", desc: "Bubble stampede! Dragging stamps clusters of colorful glowing bubbles!" };
      case "split_halves":
        return { icon: "🪓", title: "Guillotine Chop", desc: "Guillotine Chop! Upon submitting, a random half of your final drawing will be sliced off!" };
      case "flashlight":
        return { icon: "🕯️", title: "Spotlight in the Dark", desc: "Pitch black! Only a small spotlight around your cursor reveals the canvas!" };
      case "ice_skater":
        return { icon: "🧊", title: "Ice Skater Slide", desc: "Smooth frictionless ice! Gliding momentum and inertia make your strokes slide smoothly!" };
      case "typo_stomp":
        return { icon: "🔤", title: "Typo Stomp", desc: "ASCII Typewriter! Dragging your brush stamps trails of random letters, numbers, and symbols!" };
      case "shadow_finger":
        return { icon: "🌑", title: "Reverse Spotlight", desc: "Shadow finger! A giant dark eclipse circle tracks under your cursor, hiding what you're drawing until you move!" };
      case "trash_compactor":
        return { icon: "🗑️", title: "Trash Compactor", desc: "Hazard alert! Starts in 5s, then walls slowly compact the canvas! Drawing is blocked outside open walls, but your drawing stays safe!" };
      case "puzzle_jumble":
        return { icon: "🧩", title: "Puzzle Jumble", desc: "Tile scrambler! Upon submitting, all tiles are shuffled into a puzzle with numbered badges!" };
      case "snake_tail":
        return { icon: "🐍", title: "Snake", desc: "Living snake with animated head and rattle tail! When total path length exceeds 3500px, the tail is trimmed in real-time!" };
      case "tractor_beam":
        return { icon: "🛸", title: "Alien Vaporizer", desc: "UFO alert! A flying saucer charges up its vaporizing beam and disintegrates all ink beneath it!" };
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
                  <b>Secret Simultaneous Guessing</b>
                  <p>Receive all drawings at once in secret and guess who drew which piece!</p>
                </div>
              </div>
              <div className="chaos-rule-item">
                <span className="chaos-rule-icon">🏆</span>
                <div>
                  <b>Chaos Scoring (1 pt per guess)</b>
                  <p>Earn +1 point for each correct artist you identify (maximum N-1 points)!</p>
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
              margin: "clamp(0.25rem, 0.6vh, 0.5rem) 0",
              padding: "6px 14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25))",
              border: "1px solid rgba(236, 72, 153, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              boxShadow: "0 4px 15px rgba(236, 72, 153, 0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>{trickInfo.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                  ⚡ Random Trick: {trickInfo.title}
                </div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
                  {trickInfo.desc}
                </div>
              </div>
            </div>
            {props.trick === "half_time" && remainingSeconds !== null && (
              <div className="trick-timer-pill" style={{ flexShrink: 0, padding: "4px 10px", fontSize: "0.9rem" }}>
                <span>⏳</span>
                <span>{remainingSeconds}s</span>
              </div>
            )}
          </div>
        )}

        {spectating ? (
          <div className="muted" style={{ margin: "0.5rem 0" }}>
            Spectating — secret prompts are not shown to spectators. Follow who has finished in the sidebar.
          </div>
        ) : (
          <div className="prompt">
            <div className="muted small">Your prompt</div>
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
