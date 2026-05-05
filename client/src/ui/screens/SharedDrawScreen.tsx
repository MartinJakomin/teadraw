import React from "react";
import type { RoomState } from "../../types";
import { CanvasPad } from "../components/CanvasPad";

export function SharedDrawScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (dataUrl: string) => void;
}) {
  const isQM = props.fake.questionMasterId === props.me.id;
  const isFakeArtist = props.fake.fakeArtistId === props.me.id;
  const isActive = props.fake.activePlayerId === props.me.id;
  
  const activePlayerName = props.room.players.find(p => p.id === props.fake.activePlayerId)?.name ?? "Someone";
  const displayWord = isFakeArtist ? "X" : (props.fake.word || "???");
  const displayCategory = props.fake.category || "???";

  return (
    <div className="page">
      <div className="card" style={{ width: "min(1200px, 100%)" }}>
        <div className="row space">
          <div>
            <h2 style={{ margin: 0 }}>Shared Drawing</h2>
            <div className="muted">Category: <b>{displayCategory}</b></div>
          </div>
          <div className="pill">
            {isActive ? "YOUR TURN" : `Waiting for ${activePlayerName}…`}
          </div>
        </div>

        <div style={{ margin: "1.5rem 0", padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px", textAlign: "center" }}>
          <div className="muted small">Your word is:</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: isFakeArtist ? "var(--danger)" : "var(--primary2)" }}>
            {displayWord}
          </div>
          {isFakeArtist && <div className="muted small">You are the Fake Artist! Try to blend in.</div>}
        </div>

        <div className="canvas-shared-wrap">
          {/* We show the previous state of the canvas as a background or just use it as initial state */}
          <CanvasPad
            initialDataUrl={props.fake.sharedDrawingUrl}
            initialColor={props.me.color}
            allowedColor={props.me.color}
            disabled={!isActive || isQM}
            oneStrokeMode={true}
            onSubmit={(url) => {
              if (!url) return;
              props.onSubmit(url);
            }}
            submitText="Finish my stroke"
          />
        </div>

        <div className="muted small center" style={{ marginTop: "1rem" }}>
          Turn {props.fake.turnNumber} / {(props.room.players.length - 1) * 2}
        </div>
      </div>
    </div>
  );
}
