import React, { useMemo, useState } from "react";
import type { RoomState } from "../../types";

export function VoteScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  vote: NonNullable<RoomState["vote"]>;
  onVote: (optionId: string) => void;
}) {
  const isDrawer = props.vote.drawerId === props.me.id;
  const already = useMemo(() => props.vote.votedBy.includes(props.me.id), [props.me.id, props.vote.votedBy]);
  const [picked, setPicked] = useState<string>("");

  const drawer = props.room.players.find((p) => p.id === props.vote.drawerId);
  const drawerName = drawer?.name ?? "Someone";

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2>Vote</h2>
            <div className="muted" style={{ marginTop: "8px" }}>Which prompt is the real one?</div>
          </div>
        </div>

        <div className="drawer-info" style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1.2rem 0" }}>
          {drawer?.avatarUrl && (
            <img src={drawer.avatarUrl} alt="drawer" className="avatar-small" style={{ border: `2px solid ${drawer.color}` }} />
          )}
          <div className="muted">Drawing {props.vote.drawingIndex + 1} of {props.vote.totalDrawings} by <b style={{ color: drawer?.color }}>{drawerName}</b></div>
        </div>

        <img className="img" src={props.vote.imageDataUrl} alt="drawing" />

        {isDrawer ? <div className="muted">You don’t vote on your own drawing.</div> : null}
        {!isDrawer && already ? <div className="muted">Vote submitted. Waiting for others…</div> : null}

        <div className="grid">
          {props.vote.options.map((o) => {
            const isMyClue = o.text === localStorage.getItem("teadraw:myClue");
            return (
              <button
                key={o.id}
                className={picked === o.id ? "option picked" : "option"}
                disabled={isDrawer || already || isMyClue}
                onClick={() => {
                  setPicked(o.id);
                  props.onVote(o.id);
                }}
              >
                {o.text}
              </button>
            );
          })}
        </div>

        <div className="muted small">
          Voted: {props.vote.votedBy.length}/{props.room.players.length - 1}
        </div>
      </div>
    </div>
  );
}

