import React, { useMemo, useState, useEffect, useRef } from "react";
import type { RoomState } from "../../types";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";
import { TrickBadge } from "../components/TrickBadge";

function drawfulClueParticipants(room: RoomState, drawerId: string) {
  return room.players.filter((p) => p.id !== drawerId && !p.isSpectator).length;
}

export function SubmitScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  submit: NonNullable<RoomState["submit"]>;
  onSubmit: (text: string, onDone: (err?: string) => void) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDrawer = props.submit.drawerId === props.me.id;
  const already = useMemo(() => props.submit.submittedBy.includes(props.me.id), [props.me.id, props.submit.submittedBy]);
  const drawer = props.room.players.find((p) => p.id === props.submit.drawerId);
  const drawerName = drawer?.name ?? "Someone";
  const spectating = Boolean(props.me.isSpectator);
  const stripIds = props.room.drawingPlayerOrder ?? [];
  const expectedClues = drawfulClueParticipants(props.room, props.submit.drawerId);

  const handleSubmit = () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    props.onSubmit(text, (err) => {
      setSubmitting(false);
      if (err) setError(err);
    });
  };

  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    if (!props.room.endTime || hasSubmittedRef.current || already || isDrawer || spectating) return;
    const check = setInterval(() => {
      const remaining = props.room.endTime! - Date.now();
      if (remaining <= 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        clearInterval(check);
        const finalSubmit = text.trim() || `${props.me.name}'s mystery prompt`;
        props.onSubmit(finalSubmit, () => {});
      }
    }, 500);
    return () => clearInterval(check);
  }, [props.room.endTime, props.onSubmit, already, isDrawer, spectating, text]);

  return (
    <div className="page">
      <div className="card" style={{ padding: "clamp(0.5rem, 1vh, 0.9rem) clamp(0.75rem, 1.2vw, 1.2rem)" }}>
        <div className="row space">
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 1.8vw, 1.45rem)" }}>Submit a fake prompt</h2>
            <div className="muted small" style={{ marginTop: "1px" }}>
              Try to trick people into voting for yours.
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
          {props.submit.trick && <TrickBadge trick={props.submit.trick} />}
        </div>

        <img className="img" src={props.submit.imageDataUrl} alt="drawing" style={{ margin: "2px auto" }} />

        {spectating ? (
          <div className="muted small" style={{ marginTop: "0.4rem" }}>
            You are spectating — you cannot submit a fake prompt.
          </div>
        ) : isDrawer ? (
          <div className="muted small" style={{ marginTop: "0.4rem", textAlign: "center" }}>You drew this. Waiting for others to submit fake prompts…</div>
        ) : already ? (
          <div className="muted small" style={{ marginTop: "0.4rem", textAlign: "center" }}>Submitted. Waiting for others…</div>
        ) : (
          <>
            <div className="field" style={{ margin: "clamp(0.25rem, 0.6vh, 0.45rem) 0" }}>
              <label style={{ fontSize: "0.78rem" }}>Your fake prompt</label>
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError("");
                }}
                maxLength={80}
                placeholder="A duck learning algebra"
                disabled={submitting}
              />
              {error && <div className="error small">{error}</div>}
            </div>
            <div className="row">
              <button className="btn primary" disabled={!text.trim() || submitting} onClick={handleSubmit} style={{ padding: "6px 18px", fontSize: "0.88rem" }}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: "clamp(0.35rem, 0.8vh, 0.6rem)" }}>
          <PlayerOrderStrip
            players={props.room.players}
            orderedPlayerIds={stripIds}
            activePlayerId={props.submit.drawerId}
          />
          <div className="muted small" style={{ marginTop: "3px", textAlign: "center", fontSize: "0.72rem" }}>
            Drawing {props.submit.drawingIndex + 1} of {props.submit.totalDrawings} • Submitted: {props.submit.submittedBy.length}/{expectedClues}
          </div>
        </div>
      </div>
    </div>
  );
}
