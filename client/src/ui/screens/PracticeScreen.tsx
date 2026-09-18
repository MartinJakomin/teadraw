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
  { id: "ink_limit", name: "🖋️ Ink Budget (4,000px Meter)" },
  { id: "rubberband", name: "🐦 Slingshot (Pull Back & Shoot)" },
  { id: "input_delay", name: "⏱️ 2s Lag + Vanishing Ink" },
  { id: "spinning", name: "🎠 Spinning Canvas (Continuous 360°)" },
  { id: "glitch", name: "👾 Glitch Teleport (Jitter Artifacts)" },
  { id: "gravity_drip", name: "💧 Gravity Drip (Heavy Paint Drips)" },
  { id: "pixel_art", name: "🧱 8-Bit Pixel Block (Chunky 32px Grid)" },
  { id: "bubbles", name: "🫧 Bubble Stamping (Varied Size Clusters)" },
  { id: "split_halves", name: "🪓 Guillotine Chop (Random Half Sliced)" },
  { id: "flashlight", name: "🕯️ Spotlight in the Dark (Cursor Flashlight)" },
  { id: "ice_skater", name: "🧊 Ice Skater Slide (Smooth Frictionless Gliding)" },
  { id: "typo_stomp", name: "🔤 Typo Stomp (ASCII Letter Trail)" },
  { id: "shadow_finger", name: "🌑 Reverse Spotlight (Large Shadow Finger)" },
  { id: "trash_compactor", name: "🗑️ Trash Compactor (Shrinking Drawing Area)" },
  { id: "puzzle_jumble", name: "🧩 Puzzle Jumble (All 9 Tiles Shuffled & Numbered)" },
  { id: "snake_tail", name: "🐍 Snake (Animated Head & Rattle Tail)" },
  { id: "tractor_beam", name: "🛸 Alien Vaporizer (Periodic Charging Beam)" }
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
  ink_limit: "You have a strict 3,000px ink budget. Watch your ink meter gauge closely!",
  rubberband: "Pull back like a slingshot to aim and release to fire curved ballistic ink shots with impact splatter!",
  input_delay: "Strokes appear on your screen 2 seconds late, stay for 2 seconds, and then vanish from your view!",
  spinning: "The canvas physically rotates 360° continuously while you draw.",
  glitch: "Cyberpunk glitch telemetry randomly teleports and jumps your brush around.",
  gravity_drip: "Paint drips and melts downward from drawn points with heavier droplets.",
  pixel_art: "Snaps all brush strokes to a chunky retro 32px pixel grid.",
  bubbles: "Stamps sparse clusters of bubbly translucent circles with high size variance.",
  split_halves: "Guillotine Chop! Upon submitting, a random half of your final drawing will be sliced off!",
  flashlight: "The canvas is pitch black except for a tight circular spotlight tracking your cursor! Previous strokes remain completely hidden.",
  ice_skater: "Smooth frictionless ice physics! Gliding momentum and inertia make strokes slide smoothly with inertia!",
  typo_stomp: "ASCII typewriter! Strokes are stamped as strings of rotating letters, symbols, and emojis.",
  shadow_finger: "An enlarged pitch-black shadow circle follows under your finger, hiding what you're currently drawing until you move away!",
  trash_compactor: "Hazard warning! After a 5-second delay, walls slowly compress inward over 60s. Drawing outside open walls is locked, but your existing art stays intact!",
  puzzle_jumble: "Upon submitting, the canvas is divided into a 3x3 grid of 9 puzzle tiles, shuffled, and labeled with numbered badges (#1-#9) indicating the correct order!",
  snake_tail: "Your drawing is a single living snake with animated head and rattle tail! When total path length exceeds 3500px, the oldest tail segments are trimmed in real-time as you draw!",
  tractor_beam: "A UFO patrols overhead, charging up a beam every few seconds to completely vaporize and obliterate all ink beneath it!"
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
    <div
      className="page"
      style={{
        minHeight: "100vh",
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "clamp(0.75rem, 1.5vh, 1.5rem) 1rem 2.5rem",
        overflowY: "auto",
        boxSizing: "border-box"
      }}
    >
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
