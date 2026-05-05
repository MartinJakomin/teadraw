import React, { useState } from "react";
import type { RoomState } from "../../types";

export function AccuseScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onVote: (targetId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const isQM = props.fake.questionMasterId === props.me.id;
  const hasVoted = props.fake.votedForId && !!props.fake.votedForId[props.me.id];
  
  const artists = props.room.players.filter(p => p.id !== props.fake.questionMasterId);

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2>Who is the Fake Artist?</h2>
            <div className="muted">Point your finger at the imposter!</div>
          </div>
          {isQM && <div className="pill">QM Mode</div>}
        </div>

        <div style={{ margin: "1.5rem 0" }}>
           <img className="img" src={props.fake.sharedDrawingUrl} alt="shared drawing" />
        </div>

        {isQM ? (
          <div className="muted center">You are the Question Master. You don't vote. Waiting for artists…</div>
        ) : hasVoted ? (
          <div className="muted center">Accusation sent. Waiting for others…</div>
        ) : (
          <>
            <div className="grid">
              {artists.map(p => (
                <button 
                  key={p.id}
                  className={`option ${selectedId === p.id ? "picked" : ""}`}
                  disabled={p.id === props.me.id}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="row">
                    {p.avatarUrl && <img src={p.avatarUrl} alt="av" className="avatar-tiny" style={{ border: `1px solid ${p.color}` }} />}
                    <span style={{ color: p.color }}>{p.name} {p.id === props.me.id ? "(You)" : ""}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="row center" style={{ marginTop: "1.5rem" }}>
              <button 
                className="btn primary" 
                disabled={!selectedId}
                onClick={() => props.onVote(selectedId)}
              >
                Accuse!
              </button>
            </div>
          </>
        )}

        <div className="muted small center" style={{ marginTop: "1rem" }}>
          Voted: {Object.keys(props.fake.votedForId || {}).length} / {artists.length}
        </div>
      </div>
    </div>
  );
}
