import React, { useState, useEffect, useRef } from "react";
import type { RoomState } from "../../types";
import { pickRandomHints, type CategoryWordHint } from "./categoryHints";

export function CategoryScreen(props: {
  room: RoomState;
  me: RoomState["players"][number];
  fake: NonNullable<RoomState["fakeArtist"]>;
  onSubmit: (category: string, word: string) => void;
}) {
  const isQM = props.fake.questionMasterId === props.me.id;
  const [category, setCategory] = useState("");
  const [word, setWord] = useState("");
  const [hints, setHints] = useState<CategoryWordHint[] | null>(null);

  if (!isQM) {
    const qmName = props.room.players.find((p) => p.id === props.fake.questionMasterId)?.name ?? "Someone";
    return (
      <div className="page">
        <div className="card">
          <h2>Waiting for Question Master</h2>
          <div className="muted">{qmName} is choosing a category and a secret word…</div>
        </div>
      </div>
    );
  }

  const applyHint = (h: CategoryWordHint) => {
    setCategory(h.category);
    setWord(h.word);
    setHints(null);
  };

  const randomIdeas = () => {
    setHints(pickRandomHints(4, props.room.fakeArtistWordPack));
  };

  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    if (!props.room.endTime || hasSubmittedRef.current || !isQM) return;
    const check = setInterval(() => {
      const remaining = props.room.endTime! - Date.now();
      if (remaining <= 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        clearInterval(check);
        const finalCat = category.trim() || "Random";
        const finalWord = word.trim() || "Banana";
        props.onSubmit(finalCat, finalWord);
      }
    }, 500);
    return () => clearInterval(check);
  }, [props.room.endTime, props.onSubmit, isQM, category, word]);

  const packNameMap: Record<string, string> = {
    movies: "🎬 Movies & TV",
    gaming: "🎮 Gaming & Pop Culture",
    animals: "🐾 Animals & Nature",
    food: "🍕 Food & Drinks",
    landmarks: "🗽 Landmarks & World",
    superheroes: "🦸 Superheroes & Fantasy",
    all: "🌟 All Categories"
  };
  const activePackLabel = packNameMap[props.room.fakeArtistWordPack || "all"] || "🌟 All Categories";

  return (
    <div className="page">
      <div className="card">
        <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 2vw, 1.6rem)" }}>You are the Question Master!</h2>
        <div className="muted small" style={{ marginTop: "2px" }}>Choose a category and secret word for artists to draw.</div>

        <div style={{ marginTop: "0.5rem", display: "inline-block", padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 700 }}>
          <span>Word Pack: </span>
          <span style={{ color: "var(--primary2)" }}>{activePackLabel}</span>
        </div>

        <div className="field" style={{ margin: "clamp(0.4rem, 0.8vh, 0.65rem) 0" }}>
          <label style={{ fontSize: "0.8rem" }}>Category (e.g. Animals)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Animals"
            maxLength={30}
          />
        </div>

        <div className="field" style={{ margin: "clamp(0.4rem, 0.8vh, 0.65rem) 0" }}>
          <label style={{ fontSize: "0.8rem" }}>Secret Word (e.g. Elephant)</label>
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Elephant" maxLength={30} />
        </div>

        <div className="row space" style={{ marginTop: "0.5rem", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" className="btn btn-spectator-toggle" onClick={randomIdeas} style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
            <span className="btn-toggle-icon" style={{ fontSize: "1rem" }}>✨</span>
            <span>Get ideas from {activePackLabel}</span>
          </button>
        </div>

        {hints && hints.length > 0 ? (
          <div className="row" style={{ marginTop: "0.5rem", flexWrap: "wrap", gap: "6px" }}>
            {hints.map((h, i) => (
              <button type="button" key={`${h.category}-${h.word}-${i}`} className="btn" onClick={() => applyHint(h)} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 700 }}>{h.category}</span>
                <span className="muted"> / </span>
                {h.word}
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: "0.8rem" }}>
          <button className="btn primary" disabled={!category.trim() || !word.trim()} onClick={() => props.onSubmit(category, word)}>
            Start Drawing
          </button>
        </div>
      </div>
    </div>
  );
}
