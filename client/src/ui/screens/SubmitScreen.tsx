import React, { useMemo, useState } from "react";
import type { RoomState } from "../../types";

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
  const drawerName = props.room.players.find((p) => p.id === props.submit.drawerId)?.name ?? "Someone";

  const handleSubmit = () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    props.onSubmit(text, (err) => {
      setSubmitting(false);
      if (err) setError(err);
    });
  };

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2>Submit a fake prompt</h2>
            <div className="muted" style={{ marginTop: "8px" }}>Try to trick people into voting for yours.</div>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }} />

        <img className="img" src={props.submit.imageDataUrl} alt="drawing" />

        {isDrawer ? (
          <div className="muted">You drew this. Waiting for others to submit fake prompts…</div>
        ) : already ? (
          <div className="muted">Submitted. Waiting for others…</div>
        ) : (
          <>
            <div className="field">
              <label>Your fake prompt</label>
              <input 
                value={text} 
                onChange={(e) => { setText(e.target.value); setError(""); }} 
                maxLength={80} 
                placeholder="A duck learning algebra" 
                disabled={submitting}
              />
              {error && <div className="error small">{error}</div>}
            </div>
            <div className="row">
              <button className="btn primary" disabled={!text.trim() || submitting} onClick={handleSubmit}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </>
        )}

        <div className="muted small">
          Submitted: {props.submit.submittedBy.length}/{props.room.players.length - 1}
        </div>
      </div>
    </div>
  );
}
