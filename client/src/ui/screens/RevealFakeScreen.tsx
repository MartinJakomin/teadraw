import React from "react";
import type { RoomState, PlayerId } from "../../types";

export function RevealFakeScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  isHost: boolean;
  onNext: () => void;
}) {
  const fakeArtist = props.room.players.find(p => p.id === props.fake.fakeArtistId);
  const qm = props.room.players.find(p => p.id === props.fake.questionMasterId);
  
  const isCaught = props.fake.isFakeArtistCaught;
  const guess = props.fake.fakeArtistGuess;
  const word = props.fake.word;
  const isCorrectGuess = guess?.trim().toLowerCase() === word?.trim().toLowerCase();

  let resultTitle = "";
  let resultDesc = "";
  
  if (!isCaught) {
    resultTitle = "Fake Artist Wins!";
    resultDesc = `${fakeArtist?.name} was the Fake Artist and was never caught!`;
  } else if (isCorrectGuess) {
    resultTitle = "Fake Artist Wins!";
    resultDesc = `${fakeArtist?.name} was caught, but correctly guessed the word "${word}"!`;
  } else {
    resultTitle = "Artists Win!";
    resultDesc = `${fakeArtist?.name} was caught and failed to guess the word "${word}".`;
  }

  // Group votes by target
  const votes = props.fake.votedForId || {};
  const voteTallies: Record<PlayerId, PlayerId[]> = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (!voteTallies[targetId]) voteTallies[targetId] = [];
    voteTallies[targetId].push(voterId);
  });

  return (
    <div className="page">
      <div className="card" style={{ width: "min(1200px, 100%)" }}>
        <div className="row space">
          <div>
            <h1 style={{ color: "var(--primary2)" }}>{resultTitle}</h1>
            <div className="muted">{resultDesc}</div>
          </div>
          {props.isHost && (
            <button className="btn primary" onClick={props.onNext}>
              {props.room.round >= props.room.totalRounds ? "Finish Game" : "Next Round"}
            </button>
          )}
        </div>

        <div style={{ margin: "2rem 0", textAlign: "center" }}>
           <img className="img" src={props.fake.sharedDrawingUrl} alt="shared drawing" />
        </div>

        <div className="reveal-content" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "2rem" }}>
           <div className="reveal-sidebar">
              <h3>Round Details</h3>
              <div className="list">
                 <div className="listItem">
                    <div className="muted">Result</div>
                    <div className="name" style={{ color: props.fake.winner === "fake" ? "var(--primary2)" : "var(--ok)" }}>
                       {props.fake.winner === "fake" ? "Fake Artist Wins!" : "Artists Win!"}
                    </div>
                 </div>
                 <div className="listItem">
                    <div className="muted">Category</div>
                    <div className="name">{props.fake.category}</div>
                 </div>
                 <div className="listItem">
                    <div className="muted">Secret Word</div>
                    <div className="name" style={{ color: "var(--primary2)", fontWeight: 800 }}>{word}</div>
                 </div>
                 <div className="listItem">
                    <div className="muted">Question Master</div>
                    <div className="name" style={{ color: qm?.color }}>{qm?.name}</div>
                 </div>
                 <div className="listItem">
                    <div className="muted">Fake Artist</div>
                    <div className="name" style={{ color: fakeArtist?.color }}>{fakeArtist?.name}</div>
                 </div>
                 {guess && (
                    <div className="listItem">
                       <div className="muted">Fake Artist's Guess</div>
                       <div className="name" style={{ color: isCorrectGuess ? "var(--ok)" : "var(--danger)" }}>
                          {guess} {isCorrectGuess ? "✓" : "✗"}
                       </div>
                    </div>
                 )}
              </div>
           </div>

           <div className="reveal-sidebar">
              <h3>Votes Received</h3>
              <div className="list">
                 {props.room.players.map(p => {
                    const isFake = p.id === props.fake.fakeArtistId;
                    const isQM = p.id === props.fake.questionMasterId;
                    const voters = voteTallies[p.id] || [];
                    
                    return (
                       <div key={p.id} className="listItem" style={{ padding: "1rem" }}>
                          <div style={{ flex: 1 }}>
                             <div className="name" style={{ color: p.color, display: "flex", alignItems: "center", gap: "8px" }}>
                                {p.name}
                                {isFake && <span className="tag fake" style={{ fontSize: "0.6rem" }}>FAKE</span>}
                                {isQM && <span className="tag" style={{ fontSize: "0.6rem", background: "#444" }}>QM</span>}
                             </div>
                             <div className="muted small">{voters.length} suspects</div>
                          </div>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "60%" }}>
                             {voters.map(vId => {
                                const v = props.room.players.find(x => x.id === vId);
                                return (
                                   <div key={vId} title={v?.name} style={{ width: "24px", height: "24px", borderRadius: "50%", background: v?.color, border: "2px solid #fff", fontSize: "0.7rem", display: "grid", placeItems: "center", color: "#fff", fontWeight: "bold" }}>
                                      {v?.name.charAt(0)}
                                   </div>
                                );
                             })}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>

           <div className="reveal-sidebar">
              <h3>Scores</h3>
              <div className="list">
                 {props.room.players.map(p => {
                    const delta = props.fake.pointsDeltaByPlayer?.[p.id] || 0;
                    return (
                       <div key={p.id} className="listItem" style={{ padding: "1rem" }}>
                          <div style={{ flex: 1 }}>
                             <div className="name" style={{ color: p.color }}>{p.name}</div>
                             <div className="muted small">Total: {p.score} pts</div>
                          </div>
                          {delta > 0 && (
                             <div className="tag" style={{ background: "var(--ok)", color: "#fff", fontSize: "0.9rem", padding: "4px 12px" }}>
                                +{delta}
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
