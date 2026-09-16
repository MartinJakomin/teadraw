import React from "react";
import type { RoomState, PlayerId } from "../../types";

export function VoteResultsScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  isHost: boolean;
  onContinue: () => void;
}) {
  const players = props.room.players;
  const votes = props.fake.votedForId || {};
  
  // Group votes by target
  const voteTallies: Record<PlayerId, PlayerId[]> = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (!voteTallies[targetId]) voteTallies[targetId] = [];
    voteTallies[targetId].push(voterId);
  });

  return (
    <div className="page">
      <div className="card">
        <div className="row space">
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.3rem, 2vw, 1.8rem)" }}>Voting Results</h2>
            <div className="muted small" style={{ marginTop: "2px" }}>Who suspected whom?</div>
          </div>
          {props.isHost && !props.me.isSpectator ? (
            <button className="btn primary" onClick={props.onContinue}>
              Continue
            </button>
          ) : null}
        </div>

        <div className="list" style={{ marginTop: "0.75rem" }}>
          {players.map(p => {
            const isQM = p.id === props.fake.questionMasterId;
            const isFake = p.id === props.fake.fakeArtistId;
            const voters = voteTallies[p.id] || [];
            
            return (
              <div key={p.id} className="listItem" style={{ padding: "0.65rem 1rem", opacity: isQM ? 0.7 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                   <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                   <div>
                      <div className="name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {p.name}
                        {isQM && <span className="tag" style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}>QM</span>}
                        {isFake && <span className="tag fake">FAKE ARTIST</span>}
                        {!isQM && !isFake && <span className="tag" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>ARTIST</span>}
                      </div>
                      <div className="muted small">
                        {isQM ? "Host of this round" : `${voters.length} suspects`}
                      </div>
                   </div>
                </div>
                
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "40%" }}>
                   {voters.map(voterId => {
                     const voter = players.find(x => x.id === voterId);
                     return (
                       <div 
                         key={voterId} 
                         style={{ 
                           padding: "2px 10px", 
                           borderRadius: "12px", 
                           background: voter?.color, 
                           color: "white",
                           fontSize: "0.75rem",
                           fontWeight: 700,
                           boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                         }}
                       >
                         {voter?.name}
                       </div>
                     );
                   })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
