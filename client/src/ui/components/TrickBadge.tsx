import React from "react";
import type { TrickType } from "../../types";

export function getTrickDetails(trick?: TrickType) {
  if (!trick) return null;
  switch (trick) {
    case "blind":
      return { icon: "🙈", title: "Blind Drawing", bg: "rgba(147, 51, 234, 0.2)", border: "rgba(147, 51, 234, 0.45)", color: "#c084fc" };
    case "one_stroke":
      return { icon: "✏️", title: "One Stroke", bg: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.45)", color: "#60a5fa" };
    case "large_brush":
      return { icon: "🖌️", title: "Mega Brush", bg: "rgba(249, 115, 22, 0.2)", border: "rgba(249, 115, 22, 0.45)", color: "#fb923c" };
    case "random_brush":
      return { icon: "🎲", title: "Brush Roulette", bg: "rgba(236, 72, 153, 0.2)", border: "rgba(236, 72, 153, 0.45)", color: "#f472b6" };
    case "half_time":
      return { icon: "⚡", title: "Speed Rush", bg: "rgba(234, 179, 8, 0.2)", border: "rgba(234, 179, 8, 0.45)", color: "#facc15" };
    case "upside_down":
      return { icon: "🙃", title: "Inverted", bg: "rgba(16, 185, 129, 0.2)", border: "rgba(16, 185, 129, 0.45)", color: "#34d399" };
    case "wobble":
      return { icon: "〰️", title: "Earthquake Wobble", bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.45)", color: "#f87171" };
    case "mirror":
      return { icon: "🪞", title: "Mirror Symmetry", bg: "rgba(6, 182, 212, 0.2)", border: "rgba(6, 182, 212, 0.45)", color: "#22d3ee" };
    case "ink_limit":
      return { icon: "🖋️", title: "Ink Budget", bg: "rgba(168, 85, 247, 0.2)", border: "rgba(168, 85, 247, 0.45)", color: "#c084fc" };
    case "zoom_lens":
      return { icon: "🔍", title: "Magnifying Lens", bg: "rgba(56, 189, 248, 0.2)", border: "rgba(56, 189, 248, 0.45)", color: "#38bdf8" };
    case "rubberband":
      return { icon: "🐦", title: "Slingshot Shoot", bg: "rgba(236, 72, 153, 0.2)", border: "rgba(236, 72, 153, 0.45)", color: "#f472b6" };
    case "input_delay":
      return { icon: "⏱️", title: "2s Input Lag", bg: "rgba(249, 115, 22, 0.2)", border: "rgba(249, 115, 22, 0.45)", color: "#fb923c" };
    case "spinning":
      return { icon: "🎠", title: "Spinning Canvas", bg: "rgba(168, 85, 247, 0.2)", border: "rgba(168, 85, 247, 0.45)", color: "#d8b4fe" };
    case "glitch":
      return { icon: "👾", title: "Glitch Teleport", bg: "rgba(6, 182, 212, 0.2)", border: "rgba(6, 182, 212, 0.45)", color: "#22d3ee" };
    case "gravity_drip":
      return { icon: "💧", title: "Gravity Drip", bg: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.45)", color: "#60a5fa" };
    case "pixel_art":
      return { icon: "🧱", title: "8-Bit Pixel Block", bg: "rgba(234, 179, 8, 0.2)", border: "rgba(234, 179, 8, 0.45)", color: "#facc15" };
    case "bubbles":
      return { icon: "🫧", title: "Bubble Stamping", bg: "rgba(20, 184, 166, 0.2)", border: "rgba(20, 184, 166, 0.45)", color: "#2dd4bf" };
    default:
      return null;
  }
}

export function TrickBadge({ trick, style }: { trick?: TrickType; style?: React.CSSProperties }) {
  const details = getTrickDetails(trick);
  if (!details) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: details.bg,
        border: `1px solid ${details.border}`,
        color: details.color,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        verticalAlign: "middle",
        ...style
      }}
      title={`Trick applied: ${details.title}`}
    >
      <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{details.icon}</span>
      <span>{details.title}</span>
    </span>
  );
}
