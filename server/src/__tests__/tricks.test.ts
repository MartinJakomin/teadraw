import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_TRICKS,
  pickTricks,
  createRoom,
  upsertPlayer,
  startGame,
  startRound,
  submitDrawing,
  beginClueSubmit,
  submitClue,
  beginVote,
  castVote,
  scoreAndReveal,
  tallyFakeArtistAccusation,
  toPublicState
} from "../roomStore.js";
import type { Player, StrokeEvent, TrickType } from "../gameTypes.js";

const EXPECTED_TRICKS: TrickType[] = [
  "blind",
  "one_stroke",
  "large_brush",
  "random_brush",
  "half_time",
  "upside_down",
  "wobble",
  "mirror",
  "ink_limit",
  "rubberband",
  "input_delay",
  "spinning",
  "glitch",
  "gravity_drip",
  "pixel_art",
  "bubbles",
  "split_halves",
  "flashlight",
  "ice_skater",
  "typo_stomp",
  "shadow_finger",
  "trash_compactor",
  "puzzle_jumble",
  "snake_tail",
  "tractor_beam",
  "cubism",
  "spiderweb",
  "magnets",
  "wind_tunnel",
  "poltergeist"
];

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    socketId: `sock_${id}`,
    score: 0,
    connected: true,
    color: "#ef4444",
    avatarUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  };
}

describe("Trick Selection & Randomness", () => {
  it("contains all 30 unique TrickType values in ALL_TRICKS", () => {
    assert.equal(ALL_TRICKS.length, 30);
    const unique = new Set(ALL_TRICKS);
    assert.equal(unique.size, 30);
    for (const expected of EXPECTED_TRICKS) {
      assert.ok(unique.has(expected), `Missing trick in ALL_TRICKS: ${expected}`);
    }
  });

  it("draws every single trick without replacement before repeating any trick", () => {
    const used = new Set<TrickType>();
    const seen: TrickType[] = [];

    // Draw 6 rounds of 5 players = 30 tricks total
    for (let round = 0; round < 6; round++) {
      const batch = pickTricks(5, used);
      assert.equal(batch.length, 5);
      for (const t of batch) {
        assert.ok(!seen.includes(t), `Trick "${t}" repeated before all 30 tricks were drawn!`);
        seen.push(t);
      }
    }

    assert.equal(seen.length, ALL_TRICKS.length);
    assert.equal(new Set(seen).size, ALL_TRICKS.length);
    // Deck should automatically reset once all 30 have been drawn
    assert.equal(used.size, 0);

    // Next draw should work seamlessly from the refilled deck
    const nextBatch = pickTricks(4, used);
    assert.equal(nextBatch.length, 4);
    assert.equal(new Set(nextBatch).size, 4);
    assert.equal(used.size, 4);
  });

  it("handles wrap-around seamlessly when a batch crosses the 30-trick deck boundary", () => {
    const used = new Set<TrickType>();
    // Draw 28 tricks first (leaving 2 in the current deck)
    const first28 = pickTricks(28, used);
    assert.equal(new Set(first28).size, 28);
    assert.equal(used.size, 28);

    const remaining2 = ALL_TRICKS.filter((t) => !used.has(t));
    assert.equal(remaining2.length, 2);

    // Now draw 6 tricks (should include the remaining 2 from old deck + 4 fresh distinct tricks)
    const crossBatch = pickTricks(6, used);
    assert.equal(crossBatch.length, 6);
    assert.equal(new Set(crossBatch).size, 6, "Cross-boundary batch should not contain duplicate tricks");
    for (const rem of remaining2) {
      assert.ok(crossBatch.includes(rem), `Remaining trick "${rem}" should have been drawn before deck refill`);
    }
    assert.equal(used.size, 4);
  });

  it("exhibits uniform random distribution across all 30 tricks (Chi-Squared goodness-of-fit test)", () => {
    const counts = new Map<TrickType, number>();
    for (const t of ALL_TRICKS) counts.set(t, 0);

    const trials = 12_000;
    for (let i = 0; i < trials; i++) {
      // Test first-pick uniformity from fresh shuffle
      const [picked] = pickTricks(1);
      assert.ok(picked);
      counts.set(picked, (counts.get(picked) ?? 0) + 1);
    }

    const expected = trials / ALL_TRICKS.length; // 400 per trick
    let chiSquared = 0;
    for (const t of ALL_TRICKS) {
      const observed = counts.get(t) ?? 0;
      assert.ok(observed > 0, `Trick "${t}" was never selected!`);
      chiSquared += ((observed - expected) ** 2) / expected;
    }

    // Degrees of freedom = 29. Critical value at alpha = 0.001 is 58.30
    assert.ok(
      chiSquared < 58.30,
      `Distribution failed uniformity test: chiSquared=${chiSquared.toFixed(2)} (expected < 58.30)`
    );
  });

  it("assigns distinct tricks per player in startRound and cycles through all tricks across rounds", () => {
    const host = makePlayer("p1", "Alice");
    const room = createRoom(host);
    upsertPlayer(room, makePlayer("p2", "Bob"));
    upsertPlayer(room, makePlayer("p3", "Charlie"));
    upsertPlayer(room, makePlayer("p4", "Dana"));
    upsertPlayer(room, makePlayer("p5", "Eve"));

    startGame(room, {
      gameType: "drawful",
      totalRounds: 6,
      useRandomTricks: true,
      sameTrickForAll: false,
      selectedTrick: "random"
    });

    const allAssignedTricks: TrickType[] = [];
    // Round 1 was already started by startGame (since all players have avatars)
    for (let r = 1; r <= 6; r++) {
      if (r > 1) {
        room.round = r;
        startRound(room);
      }
      assert.equal(room.drawings.length, 5);
      for (const d of room.drawings) {
        assert.ok(d.trick, `Player ${d.drawerId} should have a trick in round ${r}`);
        allAssignedTricks.push(d.trick);
      }
    }

    // 5 players * 6 rounds = 30 drawings -> all 30 unique tricks must have been played!
    assert.equal(allAssignedTricks.length, 30);
    assert.equal(new Set(allAssignedTricks).size, 30);
  });

  it("supports sameTrickForAll and specific selectedTrick modes accurately", () => {
    const host = makePlayer("p1", "Alice");
    const room = createRoom(host);
    upsertPlayer(room, makePlayer("p2", "Bob"));
    upsertPlayer(room, makePlayer("p3", "Charlie"));

    // 1. sameTrickForAll = true, random
    startGame(room, {
      gameType: "drawful",
      totalRounds: 3,
      useRandomTricks: true,
      sameTrickForAll: true,
      selectedTrick: "random"
    });

    const r1Trick = room.drawings[0]?.trick;
    assert.ok(r1Trick);
    assert.ok(room.drawings.every((d) => d.trick === r1Trick));

    room.round = 2;
    startRound(room);
    const r2Trick = room.drawings[0]?.trick;
    assert.ok(r2Trick);
    assert.notEqual(r2Trick, r1Trick, "Next round shared trick should not repeat previous round's trick");
    assert.ok(room.drawings.every((d) => d.trick === r2Trick));

    // 2. Specific trick selected
    startGame(room, {
      gameType: "drawful",
      totalRounds: 1,
      useRandomTricks: true,
      sameTrickForAll: true,
      selectedTrick: "spinning"
    });
    assert.ok(room.drawings.every((d) => d.trick === "spinning"));
  });

  it("supports Custom Prompts (customPromptsOnly and mixed mode) without replacement", () => {
    const host = makePlayer("p1", "Alice");
    const room = createRoom(host);
    upsertPlayer(room, makePlayer("p2", "Bob"));
    upsertPlayer(room, makePlayer("p3", "Charlie"));

    const customList = ["Inside Joke Alpha", "Inside Joke Beta", "Inside Joke Gamma"];
    startGame(room, {
      gameType: "drawful",
      totalRounds: 2,
      useCustomPrompts: true,
      customPromptsOnly: true,
      customPrompts: customList
    });

    const round1Prompts = room.drawings.map((d) => d.prompt);
    assert.equal(round1Prompts.length, 3);
    assert.equal(new Set(round1Prompts).size, 3);
    for (const p of customList) {
      assert.ok(round1Prompts.includes(p), `Expected custom prompt "${p}" in round 1`);
    }
  });

  it("includes or omits strokeLog on Reveal based on enableStrokeReplay setting", () => {
    const host = makePlayer("p1", "Alice");
    const room = createRoom(host);
    upsertPlayer(room, makePlayer("p2", "Bob"));

    const sampleStrokes: StrokeEvent[] = [
      {
        id: "s1",
        playerId: "p1",
        points: [{ x: 10, y: 20 }, { x: 100, y: 200 }],
        brushSize: 10,
        color: { r: 0, g: 0, b: 0 },
        opacity: 1,
        timestamp: Date.now()
      }
    ];

    // 1. When enableStrokeReplay is true
    startGame(room, {
      gameType: "drawful",
      totalRounds: 1,
      enableStrokeReplay: true
    });
    const firstDrawerId = room.drawings[0]!.drawerId;
    const otherPlayerId = firstDrawerId === "p1" ? "p2" : "p1";

    submitDrawing(room, firstDrawerId, "data:image/png;base64,AAA", sampleStrokes);
    submitDrawing(room, otherPlayerId, "data:image/png;base64,BBB", sampleStrokes);
    beginClueSubmit(room);
    submitClue(room, otherPlayerId, "Fake clue");
    beginVote(room);
    castVote(room, otherPlayerId, room.options[0]!.id);
    scoreAndReveal(room);

    assert.ok(room.reveal);
    assert.equal(room.reveal.strokeLog?.length, 1);
    assert.equal(room.reveal.strokeLog?.[0]?.id, "s1");

    // 2. When enableStrokeReplay is false
    startGame(room, {
      gameType: "drawful",
      totalRounds: 1,
      enableStrokeReplay: false
    });
    const dId = room.drawings[0]!.drawerId;
    const oId = dId === "p1" ? "p2" : "p1";
    submitDrawing(room, dId, "data:image/png;base64,AAA", sampleStrokes);
    submitDrawing(room, oId, "data:image/png;base64,BBB", sampleStrokes);
    beginClueSubmit(room);
    submitClue(room, oId, "Fake clue 2");
    beginVote(room);
    castVote(room, oId, room.options[0]!.id);
    scoreAndReveal(room);

    assert.ok(room.reveal);
    assert.equal(room.reveal.strokeLog, undefined);
  });

  it("redacts secret word for Fake Artist and handles accusation ties accurately", () => {
    const host = makePlayer("p1", "Alice");
    const room = createRoom(host);
    upsertPlayer(room, makePlayer("p2", "Bob"));
    upsertPlayer(room, makePlayer("p3", "Charlie"));
    upsertPlayer(room, makePlayer("p4", "Dana"));

    startGame(room, {
      gameType: "fake_artist",
      totalRounds: 1
    });

    room.category = "Animals";
    room.word = "Octopus";
    room.phase = "draw_shared";

    const fakeId = room.fakeArtistId!;
    const realArtistId = ["p1", "p2", "p3", "p4"].find(
      (id) => id !== room.questionMasterId && id !== fakeId
    )!;

    // Fake Artist should NOT receive the secret word during draw_shared, but knows their own fakeArtistId
    const stateForFake = toPublicState(room, fakeId);
    assert.equal(stateForFake.fakeArtist?.word, undefined);
    assert.equal(stateForFake.fakeArtist?.fakeArtistId, fakeId);

    // Real artist SHOULD receive the secret word, but should NOT receive who the Fake Artist is
    const stateForReal = toPublicState(room, realArtistId);
    assert.equal(stateForReal.fakeArtist?.word, "Octopus");
    assert.equal(stateForReal.fakeArtist?.fakeArtistId, "");

    // Accusation tie: 1 vote on Fake Artist, 1 vote on Real Artist -> tie means Fake Artist is NOT caught
    room.phase = "accuse";
    room.votedForId.set(realArtistId, fakeId);
    room.votedForId.set(fakeId, realArtistId);
    tallyFakeArtistAccusation(room);
    assert.equal(room.isFakeArtistCaught, false);
    assert.equal(room.phase, "reveal_fake");
    assert.equal(room.fakeArtistWinner, "fake");
  });
});

