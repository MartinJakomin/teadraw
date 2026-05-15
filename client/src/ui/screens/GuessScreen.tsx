import React, { useState } from "react";
import type { RoomState } from "../../types";

export function GuessScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (guess: string) => void;
}) {
  const isFakeArtist = props.fake.fakeArtistId === props.me.id;
  const [guess, setGuess] = useState("");

  if (!isFakeArtist) {
    const fakeName = props.room.players.find(p => p.id === props.fake.fakeArtistId)?.name ?? "The imposter";
    return (
      <div className="page">
        <div className="card">
          <h2>CAUGHT!</h2>
          <div className="muted">{fakeName} was the Fake Artist!</div>
          <div style={{ margin: "2rem 0", textAlign: "center" }}>
             <img className="img" src={props.fake.sharedDrawingUrl} alt="shared drawing" style={{ maxWidth: "400px" }} />
          </div>
          <div className="muted">They are now trying to guess the secret word for a win…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h2>You were caught!</h2>
        <div className="muted">But you have one last chance. Guess the exact secret word to win!</div>
        
        <div style={{ margin: "2rem 0", textAlign: "center" }}>
             <img className="img" src={props.fake.sharedDrawingUrl} alt="shared drawing" style={{ maxWidth: "400px" }} />
        </div>

        <div className="field">
          <label>Your guess</label>
          <input 
            value={guess} 
            onChange={e => setGuess(e.target.value)} 
            placeholder="A potato?" 
            maxLength={30}
          />
        </div>

        <button
          className="btn primary"
          disabled={!guess.trim() || Boolean(props.me.isSpectator)}
          onClick={() => props.onSubmit(guess)}
        >
          Submit Guess
        </button>
      </div>
    </div>
  );
}
