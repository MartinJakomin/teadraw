import React, { useEffect, useMemo, useState } from "react";
import type { RoomState } from "../../types";
import { fakeArtistArtistIds } from "../fakeArtistOrder";
import { buildAccusedStrokesOverlay, parseHexColor } from "../accuseStrokeHighlight";

export function AccuseScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onVote: (targetId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [hoverId, setHoverId] = useState("");
  const [strokeOverlayUrl, setStrokeOverlayUrl] = useState<string | null>(null);

  const isQM = props.fake.questionMasterId === props.me.id;
  const hasVoted = props.fake.votedForId && !!props.fake.votedForId[props.me.id];
  const spectating = Boolean(props.me.isSpectator);

  const artistIds = useMemo(
    () => fakeArtistArtistIds(props.room, props.fake.questionMasterId),
    [props.room, props.fake.questionMasterId]
  );
  const artists = useMemo(
    () =>
      artistIds
        .map((id) => props.room.players.find((p) => p.id === id))
        .filter((p): p is RoomState["players"][number] => Boolean(p)),
    [artistIds, props.room.players]
  );

  const selectedPlayer = selectedId ? artists.find((p) => p.id === selectedId) : undefined;
  const highlightId = selectedId || hoverId;
  const highlightPlayer = highlightId ? artists.find((p) => p.id === highlightId) : undefined;
  const strokeLog = props.fake.strokeLog;

  useEffect(() => {
    let cancelled = false;
    if (!highlightId || !strokeLog?.length || !highlightPlayer || !props.room.fakeArtistHighlight) {
      setStrokeOverlayUrl(null);
      return;
    }
    const tint = parseHexColor(highlightPlayer.color);
    buildAccusedStrokesOverlay(strokeLog, highlightId, tint)
      .then((url) => {
        if (!cancelled) setStrokeOverlayUrl(url);
      })
      .catch(() => {
        if (!cancelled) setStrokeOverlayUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [highlightId, highlightPlayer, strokeLog]);

  return (
    <div className="page accuse-screen">
      <div className="card">
        <div className="row space">
          <div>
            <h2>Who is the Fake Artist?</h2>
            <div className="muted">Point your finger at the imposter!</div>
          </div>
          {isQM && <div className="pill">QM Mode</div>}
        </div>

        {selectedPlayer ? (
          <div className="accuse-banner">
            Accusing: <span style={{ color: selectedPlayer.color }}>{selectedPlayer.name}</span>
          </div>
        ) : null}

        <div
          className={`accuse-drawing-wrap ${selectedPlayer ? "accuse-drawing-wrap-selected" : ""}`}
          style={
            selectedPlayer
              ? ({ ["--accuse-selection" as string]: selectedPlayer.color } as React.CSSProperties)
              : undefined
          }
        >
          <div className="accuse-drawing-stack">
            <img
              className="accuse-base-img"
              style={{ opacity: strokeOverlayUrl ? 0.35 : 1, transition: 'opacity 0.2s' }}
              src={props.fake.sharedDrawingUrl}
              alt="shared drawing"
            />
            {strokeOverlayUrl && highlightPlayer ? (
              <img className="accuse-stroke-overlay" src={strokeOverlayUrl} alt="" />
            ) : null}
          </div>
        </div>

        {isQM ? (
          <div className="muted center">You are the Question Master. You don&apos;t vote. Waiting for artists…</div>
        ) : spectating ? (
          <div className="muted center">You are spectating — you can see accusations but cannot vote.</div>
        ) : hasVoted ? (
          <div className="muted center">Accusation sent. Waiting for others…</div>
        ) : (
          <>
            <div className="grid accuse-grid">
              {artists.map((p) => {
                const isGlow = highlightId === p.id;
                const isPicked = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`option accuse-target-btn ${isPicked ? "accuse-target-btn-picked" : ""} ${isGlow ? "accuse-target-btn-glow" : ""}`}
                    disabled={p.id === props.me.id}
                    onClick={() => setSelectedId(p.id)}
                    onMouseEnter={() => setHoverId(p.id)}
                    onMouseLeave={() => setHoverId("")}
                  >
                    <div className="row">
                      {p.avatarUrl && (
                        <img
                          src={p.avatarUrl}
                          alt="av"
                          className="avatar-tiny"
                          style={{ border: `2px solid ${p.color}` }}
                        />
                      )}
                      <span style={{ color: p.color }}>
                        {p.name} {p.id === props.me.id ? "(You)" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="row center" style={{ marginTop: "1.5rem" }}>
              <button className="btn primary" disabled={!selectedId} onClick={() => props.onVote(selectedId)}>
                Accuse!
              </button>
            </div>
          </>
        )}

        <div className="muted small center" style={{ marginTop: "1rem" }}>
          Voted: {Object.keys(props.fake.votedForId || {}).length} / {artistIds.length}
        </div>
      </div>
    </div>
  );
}
