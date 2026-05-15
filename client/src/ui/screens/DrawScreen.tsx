import React, { useMemo } from "react";
import type { RoomState } from "../../types";
import { CanvasPad } from "../components/CanvasPad";

export function DrawScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  prompt: string;
  onSubmit: (dataUrl: string) => void;
}) {
  const alreadySubmitted = useMemo(
    () => props.room.drawing?.submittedBy.includes(props.me.id) ?? false,
    [props.me.id, props.room.drawing?.submittedBy]
  );
  const spectating = Boolean(props.me.isSpectator);

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2 style={{ margin: 0 }}>Draw</h2>
            <div className="muted" style={{ marginTop: "6px" }}>
              Everyone draws their own prompt at the same time.
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }} />

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
            initialColor={props.me.color}
            allowedColor={props.me.color}
            showShades={true}
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
