import React, { useMemo, useState } from "react";
import type { RoomState } from "../../types";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";

function drawfulVoteParticipants(room: RoomState, drawerId: string) {
  return room.players.filter((p) => p.id !== drawerId && !p.isSpectator).length;
}

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
  const spectating = Boolean(props.me.isSpectator);
  const stripIds = props.room.drawingPlayerOrder ?? [];
  const expectedVotes = drawfulVoteParticipants(props.room, props.vote.drawerId);

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2>Vote</h2>
            <div className="muted" style={{ marginTop: "8px" }}>
              Which prompt is the real one?
            </div>
          </div>
        </div>

        <div className="drawer-info" style={{ display: "flex", alignItems: "center", gap: "12px", margin: "1.2rem 0" }}>
          {drawer?.avatarUrl && (
            <img src={drawer.avatarUrl} alt="drawer" className="avatar-small" style={{ border: `2px solid ${drawer.color}` }} />
          )}
          <div className="muted">
            Drawing by <b style={{ color: drawer?.color }}>{drawerName}</b>
          </div>
        </div>

        <img className="img" src={props.vote.imageDataUrl} alt="drawing" />

        {spectating ? (
          <div className="muted" style={{ marginTop: "1rem" }}>
            You are spectating — you cannot vote on prompts.
          </div>
        ) : isDrawer ? (
          <div className="muted">You don’t vote on your own drawing.</div>
        ) : null}
        {!spectating && !isDrawer && already ? <div className="muted">Vote submitted. Waiting for others…</div> : null}

        <div className="grid">
          {props.vote.options.map((o) => {
            const isMyClue = o.text === localStorage.getItem("teadraw:myClue");
            return (
              <button
                key={o.id}
                className={`option vote-option ${picked === o.id ? "picked" : ""} ${isMyClue ? "disabled-clue" : ""}`}
                disabled={spectating || isDrawer || already || isMyClue}
                onClick={() => {
                  setPicked(o.id);
                  props.onVote(o.id);
                }}
              >
                <span className="vote-option-text">{o.text}</span>
                {isMyClue && <span className="vote-option-subtext">your lie</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <PlayerOrderStrip
            players={props.room.players}
            orderedPlayerIds={stripIds}
            activePlayerId={props.vote.drawerId}
          />
          <div className="muted small" style={{ marginTop: "10px", textAlign: "center" }}>
            Drawing {props.vote.drawingIndex + 1} of {props.vote.totalDrawings}
          </div>
          <div className="muted small" style={{ marginTop: "4px", textAlign: "center" }}>
            Voted: {props.vote.votedBy.length}/{expectedVotes}
          </div>
        </div>
      </div>
    </div>
  );
}
