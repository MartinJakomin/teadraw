import React, { useMemo } from "react";
import type { RoomState, StrokeEvent } from "../../types";
import { CanvasPad } from "../components/CanvasPad";
import { PlayerOrderStrip } from "../components/PlayerOrderStrip";
import { fakeArtistArtistIds } from "../fakeArtistOrder";

export function SharedDrawScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (dataUrl: string, strokes: StrokeEvent[]) => void;
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
    <div className="page page-shared-draw">
      <div className="card card-draw-shared">
        <div className="shared-draw-header">
          <div className="shared-draw-title-block">
            <div className="shared-draw-title-row">
              <h2 className="shared-draw-heading">Shared Canvas</h2>
              <div className="pill shared-turn-pill">
                Turn {props.fake.turnNumber} / {totalStrokeSlots}
              </div>
            </div>
            <div className="shared-draw-meta">
              <span className="shared-category-badge">Category: <b>{displayCategory}</b></span>
            </div>
          </div>

          <div className={`pill shared-status-pill ${isActive ? "active-turn" : ""}`}>
            {isActive ? "🎨 YOUR TURN TO DRAW" : `⏳ Waiting for ${activePlayerName}…`}
          </div>
        </div>

        {/* Word Card Banner - Compact & Modern */}
        <div className={`shared-word-banner ${isFakeArtist ? "fake-artist-banner" : ""}`}>
          <div className="shared-word-label">
            {isFakeArtist ? "🎭 YOU ARE THE FAKE ARTIST" : "YOUR SECRET WORD"}
          </div>
          <div className="shared-word-value">
            {displayWord}
          </div>
          {isFakeArtist && (
            <div className="shared-word-hint">You do not know the real word! Blend in and pretend you do.</div>
          )}
        </div>

        {spectating && !isQM ? (
          <div className="muted center shared-spectate-msg">
            You are spectating — you can watch the canvas update live but cannot add strokes.
          </div>
        ) : null}

        <div className="canvas-shared-wrap">
          <CanvasPad
            playerId={props.me.id}
            initialDataUrl={props.fake.sharedDrawingUrl}
            initialColor={props.me.color}
            allowedColor={props.me.color}
            endTime={props.room.endTime}
            disabled={!isActive || isQM || spectating}
            oneStrokeMode={true}
            inkLimit={props.room.fakeArtistInkLimit ? (props.room.fakeArtistInkBudget || 600) : undefined}
            onSubmit={(url, strokes) => {
              if (!url) return;
              props.onSubmit(url, strokes);
            }}
            submitText="Finish my stroke"
          />
        </div>

        <div className="shared-order-section">
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
