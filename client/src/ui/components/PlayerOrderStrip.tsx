import React, { useEffect, useRef } from "react";
import type { PlayerId, RoomState } from "../../types";

type PlayerRow = RoomState["players"][number];

export function PlayerOrderStrip(props: {
  players: PlayerRow[];
  /** Sequence of player ids to show (may repeat for two-pass rounds) */
  orderedPlayerIds: PlayerId[];
  activePlayerId?: string;
  /**
   * When set, only this index in `orderedPlayerIds` is treated as active.
   */
  activeSlotIndex?: number | null;
}) {
  const byId = new Map(props.players.map((p) => [p.id, p]));

  const maxVisible = 10;
  const total = props.orderedPlayerIds.length;
  
  let activeIdx = typeof props.activeSlotIndex === "number" 
    ? props.activeSlotIndex 
    : Math.max(0, props.orderedPlayerIds.findIndex(id => id === props.activePlayerId));

  let start = 0;
  let end = total;

  if (total > maxVisible) {
    const half = Math.floor(maxVisible / 2);
    start = Math.max(0, activeIdx - half);
    end = start + maxVisible;
    
    if (end > total) {
      end = total;
      start = Math.max(0, total - maxVisible);
    }
  }

  const showStartDots = start > 0;
  const showEndDots = end < total;
  
  const visibleItems = props.orderedPlayerIds
    .map((id, index) => ({ id, index }))
    .slice(start, end);

  return (
    <div className="player-order-strip" style={{ overflowX: "hidden" }}>
      <div className="player-order-strip-inner" style={{ justifyContent: "center" }}>
        {showStartDots && (
          <div className="player-order-chip" style={{ color: "rgba(255,255,255,0.5)" }}>
            ...
          </div>
        )}
        
        {visibleItems.map(({ id, index }) => {
          const p = byId.get(id);
          if (!p) return null;
          const active =
            typeof props.activeSlotIndex === "number"
              ? index === props.activeSlotIndex
              : Boolean(props.activePlayerId && props.activePlayerId === id);
              
          return (
            <div
              key={`${id}-${index}`}
              className={`player-order-chip ${active ? "player-order-chip-active" : ""}`}
              title={p.name}
            >
              <span className="player-order-dot" style={{ background: p.color }} />
              <span className="player-order-name" style={{ color: p.color }}>
                {p.name}
              </span>
            </div>
          );
        })}

        {showEndDots && (
          <div className="player-order-chip" style={{ color: "rgba(255,255,255,0.5)" }}>
            ...
          </div>
        )}
      </div>
    </div>
  );
}
