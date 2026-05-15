import React, { useMemo } from "react";
import type { RoomState } from "../../types";
import { CanvasPad } from "../components/CanvasPad";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";
import { fakeArtistArtistIds } from "../fakeArtistOrder";

export function SharedDrawScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (dataUrl: string) => void;
}) {
  const isQM = props.fake.questionMasterId === props.me.id;
  const isFakeArtist = props.fake.fakeArtistId === props.me.id;
  const isActive = props.fake.activePlayerId === props.me.id;
  const spectating = Boolean(props.me.isSpectator);

  const activePlayerName = props.room.players.find((p) => p.id === props.fake.activePlayerId)?.name ?? "Someone";
  const displayWord = isFakeArtist ? "X" : props.fake.word || "???";
  const displayCategory = props.fake.category || "???";

  const artistIds = useMemo(
    () => fakeArtistArtistIds(props.room, props.fake.questionMasterId),
    [props.room, props.fake.questionMasterId]
  );
  const doubledOrder = useMemo(() => [...artistIds, ...artistIds], [artistIds]);
  const totalStrokeSlots = Math.max(1, artistIds.length * 2);
  const activeSlotIndex =
    doubledOrder.length > 0
      ? Math.min(Math.max(props.fake.turnNumber - 1, 0), doubledOrder.length - 1)
      : null;

  return (
    <div className="page">
      <div className="card" style={{ width: "min(1200px, 100%)" }}>
        <div className="row space">
          <div>
            <h2 style={{ margin: 0 }}>Shared Drawing</h2>
            <div className="muted">
              Category: <b>{displayCategory}</b>
            </div>
          </div>
          <div className="pill">
            {isActive ? "YOUR TURN" : `Waiting for ${activePlayerName}…`}
          </div>
        </div>

        <div
          style={{
            margin: "1.5rem 0",
            padding: "1rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            textAlign: "center"
          }}
        >
          <div className="muted small">Your word is:</div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: isFakeArtist ? "var(--danger)" : "var(--primary2)"
            }}
          >
            {displayWord}
          </div>
          {isFakeArtist && <div className="muted small">You are the Fake Artist! Try to blend in.</div>}
        </div>

        {spectating && !isQM ? (
          <div className="muted center" style={{ marginBottom: "1rem" }}>
            You are spectating — you can watch the canvas update but cannot add strokes.
          </div>
        ) : null}

        <div className="canvas-shared-wrap">
          <CanvasPad
            initialDataUrl={props.fake.sharedDrawingUrl}
            initialColor={props.me.color}
            allowedColor={props.me.color}
            disabled={!isActive || isQM || spectating}
            oneStrokeMode={true}
            onSubmit={(url) => {
              if (!url) return;
              props.onSubmit(url);
            }}
            submitText="Finish my stroke"
          />
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          <div className="pill" style={{ display: "inline-block", marginBottom: "8px" }}>
            Turn {props.fake.turnNumber} / {totalStrokeSlots}
          </div>
          <PlayerOrderStrip
            players={props.room.players}
            orderedPlayerIds={doubledOrder}
            activePlayerId={props.fake.activePlayerId}
            activeSlotIndex={activeSlotIndex}
          />
        </div>
      </div>
    </div>
  );
}
