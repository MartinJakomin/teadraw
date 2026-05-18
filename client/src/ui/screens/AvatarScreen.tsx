import React, { useState } from "react";
import type { RoomState } from "../../types";
import { CanvasPad } from "../components/CanvasPad";

export function AvatarScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  onAvatarSubmit: (imageDataUrl: string, color: string) => void;
}) {

  const already = props.room.avatar?.submittedBy.includes(props.me.id);
  const spectating = Boolean(props.me.isSpectator);

  if (spectating) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Spectating</h2>
          <div className="muted">You are watching as a spectator — you do not submit an avatar.</div>
        </div>
      </div>
    );
  }

  if (already) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Looking good!</h2>
          <div className="muted">Waiting for other players to finish their avatars...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">Draw your Avatar</h2>
        <div className="muted" style={{ marginBottom: "16px" }}>
          Draw yourself using your assigned color and its shades!
        </div>

        <CanvasPad
          width={400}
          height={400}
          strokeWidth={8}
          playerId={props.me.id}
          initialColor={props.me.color}
          allowedColor={props.me.color}
          onSubmit={(dataUrl) => props.onAvatarSubmit(dataUrl, props.me.color)}
        />
      </div>
    </div>
  );
}
