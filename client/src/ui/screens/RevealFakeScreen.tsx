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
          {props.isHost && !props.me.isSpectator ? (
            <button className="btn primary" onClick={props.onNext}>
              {props.room.round >= props.room.totalRounds ? "Finish Game" : "Next Round"}
            </button>
          ) : null}
        </div>

        <div className="reveal-content">
           <div className="reveal-main">
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                 <img className="img reveal-img" src={props.fake.sharedDrawingUrl} alt="shared drawing" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                 <div className="reveal-sidebar" style={{ height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Round Details</h3>
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

                 <div className="reveal-sidebar" style={{ height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Votes Received</h3>
                    <div className="list" style={props.room.players.length > 4 ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } : undefined}>
                       {props.room.players.map(p => {
                          const isFake = p.id === props.fake.fakeArtistId;
                          const isQM = p.id === props.fake.questionMasterId;
                          const voters = voteTallies[p.id] || [];
                          
                          return (
                             <div key={p.id} className="listItem" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div style={{ flex: 1 }}>
                                   <div className="name" style={{ color: p.color, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      {p.name}
                                      {isFake && <span className="tag fake" style={{ fontSize: "0.6rem" }}>FAKE</span>}
                                      {isQM && <span className="tag" style={{ fontSize: "0.6rem", background: "#444" }}>QM</span>}
                                   </div>
                                   <div className="muted small">{voters.length} suspects</div>
                                </div>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
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
              </div>
           </div>

           <div className="reveal-sidebar">
              <h3 style={{ marginBottom: "1rem" }}>Scoreboard</h3>
              <div className="list compact">
                 {[...props.room.players].sort((a, b) => b.score - a.score).map(p => {
                    const delta = props.fake.pointsDeltaByPlayer?.[p.id] || 0;
                    return (
                       <div key={p.id} className="listItem scoreboard-item">
                          <div className="row" style={{ gap: "8px" }}>
                             {p.avatarUrl && <img src={p.avatarUrl} alt="av" className="avatar-tiny" style={{ border: `1px solid ${p.color}` }} />}
                             <div className="name" style={{ color: p.color, fontSize: "0.9rem" }}>{p.name}</div>
                          </div>
                          <div className="scoreLine">
                             {delta !== 0 && (
                                <span className={delta > 0 ? "delta plus" : "delta minus"}>
                                   {delta > 0 ? `+${delta}` : delta}
                                </span>
                             )}
                             <span className="score">{p.score}</span>
                          </div>
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
