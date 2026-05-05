import React, { useState } from "react";
import type { RoomState } from "../../types";

export function CategoryScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (category: string, word: string) => void;
}) {
  const isQM = props.fake.questionMasterId === props.me.id;
  const [category, setCategory] = useState("");
  const [word, setWord] = useState("");

  if (!isQM) {
    const qmName = props.room.players.find(p => p.id === props.fake.questionMasterId)?.name ?? "Someone";
    return (
      <div className="page">
        <div className="card">
          <h2>Waiting for Question Master</h2>
          <div className="muted">{qmName} is choosing a category and a secret word…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h2>You are the Question Master!</h2>
        <div className="muted">Choose a category and a secret word. Everyone except the Fake Artist will see them.</div>
        
        <div style={{ marginTop: "2rem" }} />

        <div className="field">
          <label>Category (e.g. Animals)</label>
          <input 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            placeholder="Animals" 
            maxLength={30}
          />
        </div>

        <div className="field">
          <label>Secret Word (e.g. Elephant)</label>
          <input 
            value={word} 
            onChange={e => setWord(e.target.value)} 
            placeholder="Elephant" 
            maxLength={30}
          />
        </div>

        <button 
          className="btn primary" 
          disabled={!category.trim() || !word.trim()}
          onClick={() => props.onSubmit(category, word)}
        >
          Start Drawing
        </button>
      </div>
    </div>
  );
}
