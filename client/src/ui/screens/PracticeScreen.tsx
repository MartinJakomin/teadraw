import React, { useState } from "react";
import type { TrickType } from "../../types";
import { CanvasPad } from "../components/CanvasPad";
import { downloadImageDataUrl } from "../downloadImage";
import { getTrickDetails, TrickBadge } from "../components/TrickBadge";

const ALL_TRICKS: Array<{ id: TrickType; name: string }> = [
  { id: "blind", name: "🙈 Blind Drawing (Hidden Canvas)" },
  { id: "one_stroke", name: "✏️ One Stroke Only (Cannot Lift)" },
  { id: "large_brush", name: "🖌️ Mega Brush (35px Locked)" },
  { id: "random_brush", name: "🎲 Brush Roulette (Dynamic Morphing)" },
  { id: "half_time", name: "⚡ Speed Rush (20s Fast Draw)" },
  { id: "upside_down", name: "🙃 Inverted Controls (Inverted X/Y)" },
  { id: "wobble", name: "〰️ Earthquake Wobble (Tremor Jitter)" },
  { id: "mirror", name: "🪞 Mirror Symmetry (Dual Reflection)" },
  { id: "ink_limit", name: "🖋️ Ink Budget (2,000px Meter)" },
  { id: "zoom_lens", name: "🔍 Magnifying Lens (3x Zoom Viewport)" },
  { id: "rubberband", name: "🐦 Slingshot (Pull Back & Shoot)" },
  { id: "input_delay", name: "⏱️ 2-Second Input Lag (Delayed Queue)" },
  { id: "spinning", name: "🎠 Spinning Canvas (Continuous 360°)" },
  { id: "glitch", name: "👾 Glitch Teleport (Jitter Artifacts)" },
  { id: "gravity_drip", name: "💧 Gravity Drip (Melting Paint Drops)" },
  { id: "pixel_art", name: "🧱 8-Bit Pixel Block (Chunky 32px Grid)" },
  { id: "bubbles", name: "🫧 Bubble Stamping (Clustered Bubbles)" }
];

const TRICK_DESCRIPTIONS: Record<TrickType, string> = {
  blind: "Strokes are completely hidden on screen while drawing! Draw from muscle memory.",
  one_stroke: "You get 1 continuous stroke only. Once you release the cursor, drawing is locked.",
  large_brush: "Locked to an extra-chunky 35px mega brush width.",
  random_brush: "Brush size dynamically and automatically morphs between 4px and 42px as you drag.",
  half_time: "Draw against the clock with high pressure and urgency.",
  upside_down: "Inverted mouse/touch movement! Moving up draws down, and moving left draws right.",
  wobble: "Chaotic oscillating earthquake tremors are injected into your brush coordinates.",
  mirror: "Draws dual mirrored reflections horizontally across the canvas center line.",
  ink_limit: "You have a strict 2,000px ink budget. Watch your ink meter gauge closely!",
  zoom_lens: "Canvas is zoomed in 2.65x in a focused viewport tracking your cursor movement.",
  rubberband: "Pull back like a slingshot to aim and release to fire ink shots with impact splatter!",
  input_delay: "All strokes appear on canvas with a strict 2,000ms delay after you draw them.",
  spinning: "The canvas physically rotates 360° continuously while you draw.",
  glitch: "Cyberpunk glitch telemetry randomly teleports and jumps your brush around.",
  gravity_drip: "Paint drips and melts downward from drawn points with droplet beads at the bottom.",
  pixel_art: "Snaps all brush strokes to a chunky retro 32px pixel grid.",
  bubbles: "Stamps clusters of bubbly translucent circles with bright specular highlights."
};

export function PracticeScreen(props: { onExit: () => void }) {
  const [selectedTrick, setSelectedTrick] = useState<TrickType | "none">("none");
  const [currentDataUrl, setCurrentDataUrl] = useState<string>("");
  const [speedRushKey, setSpeedRushKey] = useState<number>(0);

  const activeTrick = selectedTrick === "none" ? undefined : selectedTrick;
  const activeDetails = getTrickDetails(activeTrick);
  const activeDesc = activeTrick ? TRICK_DESCRIPTIONS[activeTrick] : null;

  const handlePickRandomTrick = () => {
    const pick = ALL_TRICKS[Math.floor(Math.random() * ALL_TRICKS.length)]!;
    setSelectedTrick(pick.id);
    if (pick.id === "half_time") setSpeedRushKey((k) => k + 1);
  };

  const handleSaveDrawing = (dataUrl: string) => {
    setCurrentDataUrl(dataUrl);
    const filename = `teadraw-practice-${selectedTrick}-${Date.now()}.png`;
    downloadImageDataUrl(dataUrl, filename);
  };

  return (
    <div className="page center" style={{ minHeight: "100vh", padding: "clamp(0.5rem, 1.2vh, 1rem) 1rem" }}>
      <div style={{ maxWidth: "980px", width: "100%" }}>
        {/* Top Control Bar */}
        <div
          className="card"
          style={{
            marginBottom: "clamp(0.5rem, 1vh, 0.8rem)",
            padding: "clamp(0.6rem, 1vh, 0.9rem) clamp(0.8rem, 1.2vw, 1.2rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="btn"
              onClick={props.onExit}
              style={{ padding: "6px 14px", fontSize: "0.85rem", fontWeight: 700 }}
            >
              ← Back
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🎨 Practice Mode</span>
                {activeTrick && <TrickBadge trick={activeTrick} />}
              </h2>
              <div className="muted small">Test tricks, experiment with mechanics, or doodle freely!</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "rgba(255, 255, 255, 0.8)", whiteSpace: "nowrap" }}>
                Select Trick:
              </label>
              <select
                value={selectedTrick}
                onChange={(e) => {
                  const val = e.target.value as TrickType | "none";
                  setSelectedTrick(val);
                  if (val === "half_time") setSpeedRushKey((k) => k + 1);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <option value="none">✨ Normal Canvas (No Trick)</option>
                {ALL_TRICKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn"
              type="button"
              onClick={handlePickRandomTrick}
              style={{
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 800,
                background: "rgba(236, 72, 153, 0.15)",
                border: "1px solid rgba(236, 72, 153, 0.4)",
                color: "#f472b6"
              }}
              title="Roll a random trick"
            >
              🎲 Random Trick
            </button>
          </div>
        </div>

        {/* Trick Description Banner */}
        {activeTrick && (
          <div
            className="scale-in"
            style={{
              marginBottom: "clamp(0.5rem, 1vh, 0.8rem)",
              padding: "8px 14px",
              borderRadius: "14px",
              background: activeDetails?.bg ?? "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${activeDetails?.border ?? "rgba(255, 255, 255, 0.15)"}`,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)"
            }}
          >
            <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{activeDetails?.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: activeDetails?.color ?? "#fff" }}>
                Active Trick: {activeDetails?.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "2px" }}>
                {activeDesc}
              </div>
            </div>
          </div>
        )}

        {/* Interactive CanvasPad */}
        <div className="card" style={{ padding: "clamp(0.6rem, 1vw, 1rem)" }}>
          <CanvasPad
            key={`${selectedTrick}-${speedRushKey}`}
            playerId="practice-user"
            trick={activeTrick}
            autoSubmitOnOneStroke={false}
            submitText="💾 Save Drawing"
            onSubmit={(dataUrl) => handleSaveDrawing(dataUrl)}
          />
        </div>
      </div>
    </div>
  );
}
