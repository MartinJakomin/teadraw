import { nanoid } from "nanoid";
import type { Drawing, Option, Phase, Player, PlayerId, Reveal, RoomCode, RoomStatePublic } from "./gameTypes.js";
import { pickPrompts } from "./prompts.js";

/** Non-spectators in join order (includes disconnected). */
export function playingPlayerIdsInOrder(room: { playerOrder: PlayerId[]; playersById: Map<PlayerId, Player> }): PlayerId[] {
  return room.playerOrder.filter((id) => !room.playersById.get(id)?.isSpectator);
}

/** Fake Artist artists after QM in table order, excluding spectators. */
export function getFakeArtistArtistOrder(room: Room): PlayerId[] {
  const qm = room.questionMasterId;
  if (!qm) return [];
  const qmIndex = room.playerOrder.indexOf(qm);
  if (qmIndex < 0) return [];
  const out: PlayerId[] = [];
  for (let i = 1; i <= room.playerOrder.length; i++) {
    const idx = (qmIndex + i) % room.playerOrder.length;
    const pid = room.playerOrder[idx]!;
    if (pid === qm) continue;
    const p = room.playersById.get(pid);
    if (p && !p.isSpectator) out.push(pid);
  }
  return out;
}

export function toggleSpectator(room: Room, playerId: PlayerId): { ok: boolean; error?: string } {
  if (room.phase !== "lobby") return { ok: false, error: "Spectator mode can only be changed in the lobby." };
  const p = room.playersById.get(playerId);
  if (!p) return { ok: false, error: "Player not found." };
  if (p.isSpectator) {
    p.isSpectator = false;
    return { ok: true };
  }
  const othersPlaying = listPlayers(room).filter((x) => x.id !== playerId && x.connected && !x.isSpectator);
  if (room.hostId === playerId && othersPlaying.length === 0) {
    return {
      ok: false,
      error: "Another online player who is not spectating must be in the room before the host can watch as spectator."
    };
  }
  p.isSpectator = true;
  if (room.hostId === playerId) {
    room.hostId = othersPlaying[0]!.id;
  }
  return { ok: true };
}

type Room = {
  roomCode: RoomCode;
  hostId: PlayerId;
  phase: Phase;
  playersById: Map<PlayerId, Player>;
  playerOrder: PlayerId[];
  gameType: "drawful" | "fake_artist";

  round: number;
  totalRounds: number;
  timerSeconds: number;
  useExtraPrompt: boolean;
  fakeArtistHighlight: boolean;
  lockColors: boolean;
  revealOrder: "random" | "round_robin";
  botCount: number;

  endTime?: number;
  timeoutId?: NodeJS.Timeout;

  drawings: Drawing[];
  drawingIndex: number;

  clueByPlayerId: Map<PlayerId, string>;
  options: Option[];
  voteByVoterId: Map<PlayerId, string>;
  reveal?: Reveal;
  usedPrompts: Set<string>;

  // Fake Artist specific
  questionMasterId?: PlayerId;
  fakeArtistId?: PlayerId;
  category?: string;
  word?: string;
  activePlayerId?: PlayerId;
  turnNumber: number;
  sharedDrawingUrl?: string;
  /** After each stroke: full canvas snapshot + drawer (sent to clients in accuse phase for per-player highlight). */
  fakeArtistStrokeLog: Array<{ playerId: PlayerId; snapshotUrl: string }>;
  votedForId: Map<PlayerId, PlayerId>;
  isFakeArtistCaught?: boolean;
  fakeArtistGuess?: string;
  fakeArtistWinner?: "artists" | "fake";
  pointsDeltaByPlayer: Map<PlayerId, number>;
};

const rooms = new Map<RoomCode, Room>();

function makeRoomCode(): RoomCode {
  // 4 letters, avoids confusing characters.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export function createRoom(host: Player): Room {
  let roomCode = makeRoomCode();
  while (rooms.has(roomCode)) roomCode = makeRoomCode();

  const room: Room = {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    playersById: new Map([[host.id, host]]),
    playerOrder: [host.id],
    gameType: "drawful",
    round: 0,
    totalRounds: 1,
    timerSeconds: 0,
    useExtraPrompt: false,
    lockColors: false,
    revealOrder: "random",
    fakeArtistHighlight: true,
    botCount: 0,
    drawings: [],
    drawingIndex: 0,
    clueByPlayerId: new Map(),
    options: [],
    voteByVoterId: new Map(),
    votedForId: new Map(),
    usedPrompts: new Set(),
    turnNumber: 0,
    fakeArtistStrokeLog: [],
    pointsDeltaByPlayer: new Map()
  };
  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode: RoomCode): Room | undefined {
  return rooms.get(roomCode);
}

export function removeRoom(roomCode: RoomCode) {
  rooms.delete(roomCode);
}

export function listPlayers(room: Room) {
  return [...room.playersById.values()];
}

export function toPublicState(room: Room): RoomStatePublic {
  const players = listPlayers(room)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      color: p.color,
      avatarUrl: p.avatarUrl,
      isBot: p.isBot,
      isSpectator: p.isSpectator
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const currentDrawing = room.drawings[room.drawingIndex];

  const base: RoomStatePublic = {
    roomCode: room.roomCode,
    hostId: room.hostId,
    phase: room.phase,
    gameType: room.gameType,
    round: room.round,
    totalRounds: room.totalRounds,
    timerSeconds: room.timerSeconds,
    useExtraPrompt: room.useExtraPrompt,
    lockColors: room.lockColors,
    revealOrder: room.revealOrder,
    fakeArtistHighlight: room.fakeArtistHighlight,
    botCount: room.botCount,
    playerOrder: [...room.playerOrder],
    endTime: room.endTime,
    players
  };

  if (room.gameType === "drawful" && room.drawings.length > 0) {
    base.drawingPlayerOrder = room.drawings.map((d) => d.drawerId);
  }

  if (room.phase === "avatar") {
    base.avatar = {
      submittedBy: listPlayers(room).filter(p => !!p.avatarUrl).map(p => p.id)
    };
  }

  if (room.phase === "draw") {
    base.drawing = {
      submittedBy: room.drawings.filter((d) => !!d.imageDataUrl).map((d) => d.drawerId)
    };
  }

  if (room.phase === "submit" && currentDrawing) {
    base.submit = {
      drawerId: currentDrawing.drawerId,
      imageDataUrl: currentDrawing.imageDataUrl || "",
      submittedBy: [...room.clueByPlayerId.keys()],
      drawingIndex: room.drawingIndex,
      totalDrawings: room.drawings.length
    };
  }

  if (room.phase === "vote" && currentDrawing) {
    base.vote = {
      drawerId: currentDrawing.drawerId,
      imageDataUrl: currentDrawing.imageDataUrl || "",
      options: room.options.map((o) => ({ id: o.id, text: o.text })),
      votedBy: [...room.voteByVoterId.keys()],
      drawingIndex: room.drawingIndex,
      totalDrawings: room.drawings.length
    };
  }

  if (room.phase === "reveal" && room.reveal) {
    base.reveal = {
      ...room.reveal,
      totalDrawings: room.drawings.length
    };
  }

  if (room.gameType === "fake_artist" && room.questionMasterId && room.fakeArtistId) {
    const fa: NonNullable<RoomStatePublic["fakeArtist"]> = {
      questionMasterId: room.questionMasterId,
      fakeArtistId: room.fakeArtistId,
      category: room.category,
      word: room.word, // We'll filter this in App.tsx or similar based on role
      activePlayerId: room.activePlayerId,
      turnNumber: room.turnNumber,
      sharedDrawingUrl: room.sharedDrawingUrl,
      votedForId: Object.fromEntries(room.votedForId.entries()),
      isFakeArtistCaught: room.isFakeArtistCaught,
      fakeArtistGuess: room.fakeArtistGuess,
      winner: room.fakeArtistWinner,
      pointsDeltaByPlayer: Object.fromEntries(room.pointsDeltaByPlayer.entries())
    };
    if (room.phase === "accuse" && room.fakeArtistStrokeLog.length > 0) {
      fa.strokeLog = room.fakeArtistStrokeLog.map((e) => ({ playerId: e.playerId, snapshotUrl: e.snapshotUrl }));
    }
    base.fakeArtist = fa;
  }

  return base;
}

export function upsertPlayer(room: Room, player: Player) {
  const existing = room.playersById.get(player.id);
  if (existing) {
    existing.name = player.name;
    existing.connected = player.connected;
    existing.socketId = player.socketId;
  } else {
    room.playersById.set(player.id, player);
    room.playerOrder.push(player.id);
  }
}

export function setConnected(room: Room, playerId: PlayerId, connected: boolean, socketId?: string) {
  const p = room.playersById.get(playerId);
  if (!p) return;
  p.connected = connected;
  if (socketId) p.socketId = socketId;
}

export function maybeReassignHost(room: Room) {
  const host = room.playersById.get(room.hostId);
  if (host?.connected) return;
  const next = listPlayers(room).find((p) => p.connected && !p.isSpectator) ?? listPlayers(room).find((p) => p.connected);
  if (next) room.hostId = next.id;
}

export function ensureLobby(room: Room) {
  room.phase = "lobby";
  room.round = 0;
  room.drawings = [];
  room.drawingIndex = 0;
  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.reveal = undefined;
  room.usedPrompts.clear();
  for (const p of room.playersById.values()) {
    p.avatarUrl = undefined;
  }
  clearRoomTimer(room);
}

export function clearRoomTimer(room: Room) {
  if (room.timeoutId) {
    clearTimeout(room.timeoutId);
    room.timeoutId = undefined;
  }
  room.endTime = undefined;
}

function rotate<T>(arr: T[], shift: number): T[] {
  if (arr.length === 0) return [];
  const s = ((shift % arr.length) + arr.length) % arr.length;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

function computeRevealOrder(room: Room, players: PlayerId[], round: number): PlayerId[] {
  if (room.revealOrder === "round_robin") {
    return rotate(players, (round - 1) % Math.max(1, players.length));
  }
  return shuffle(players);
}

export function startGame(room: Room, options: { gameType?: "drawful" | "fake_artist"; totalRounds?: number; revealOrder?: "random" | "round_robin"; timerSeconds?: number; useExtraPrompt?: boolean; lockColors?: boolean; fakeArtistHighlight?: boolean }) {
  room.round = 1;
  room.gameType = options.gameType || "drawful";
  room.totalRounds = options.totalRounds !== undefined ? options.totalRounds : room.totalRounds;
  room.timerSeconds = options.timerSeconds || 0;
  room.useExtraPrompt = options.useExtraPrompt || false;
  room.lockColors = options.lockColors || false;
  room.fakeArtistHighlight = options.fakeArtistHighlight !== undefined ? options.fakeArtistHighlight : true;
  room.revealOrder = options.revealOrder || "random";
  room.usedPrompts.clear();

  // Reset scores
  for (const p of room.playersById.values()) {
    p.score = 0;
  }

  const playersWithAvatars = listPlayers(room).filter(p => !!p.avatarUrl);
  const allHaveAvatars = playersWithAvatars.length === room.playersById.size;

  if (allHaveAvatars && room.playersById.size > 0) {
    beginRound(room);
  } else {
    room.phase = "avatar";
  }
}

export function beginRound(room: Room) {
  if (room.gameType === "fake_artist") {
    beginFakeArtistRound(room);
  } else {
    startRound(room);
  }
}

export function beginFakeArtistRound(room: Room) {
  const pids = listPlayers(room).filter((p) => !p.isSpectator).map((p) => p.id);
  if (pids.length < 3) return; // Should be handled by UI but good to have

  // Pick QM (rotates or random)
  const qmIndex = (room.round - 1) % pids.length;
  room.questionMasterId = pids[qmIndex];

  // Pick Fake Artist (random from others)
  const others = pids.filter(id => id !== room.questionMasterId);
  room.fakeArtistId = others[Math.floor(Math.random() * others.length)];

  room.category = undefined;
  room.word = undefined;
  room.sharedDrawingUrl = undefined;
  room.fakeArtistStrokeLog = [];
  room.turnNumber = 0;
  room.votedForId.clear();
  room.isFakeArtistCaught = undefined;
  room.fakeArtistGuess = undefined;
  room.fakeArtistWinner = undefined;
  room.pointsDeltaByPlayer.clear();

  room.phase = "category";
}

export function resolveFakeArtistRound(room: Room, fakeArtistWins: boolean) {
  room.fakeArtistWinner = fakeArtistWins ? "fake" : "artists";
  room.pointsDeltaByPlayer.clear();

  if (fakeArtistWins) {
    const fakeArtist = room.playersById.get(room.fakeArtistId!);
    const qm = room.playersById.get(room.questionMasterId!);
    if (fakeArtist) {
      fakeArtist.score += 2;
      room.pointsDeltaByPlayer.set(fakeArtist.id, 2);
    }
    if (qm) {
      qm.score += 2;
      room.pointsDeltaByPlayer.set(qm.id, 2);
    }
  } else {
    room.playersById.forEach(p => {
      if (p.id !== room.fakeArtistId && p.id !== room.questionMasterId && !p.isSpectator) {
        p.score += 1;
        room.pointsDeltaByPlayer.set(p.id, 1);
      }
    });
  }
}

export function submitAvatar(room: Room, playerId: PlayerId, imageDataUrl: string, color: string) {
  const p = room.playersById.get(playerId);
  if (p) {
    p.avatarUrl = imageDataUrl;
    p.color = color;
  }
}

export function allAvatarsSubmitted(room: Room): boolean {
  const activePlayers = room.playerOrder.filter((id) => {
    const p = room.playersById.get(id);
    return p?.connected && !p.isSpectator;
  });
  if (activePlayers.length === 0) return false;
  return activePlayers.every((id) => {
    const p = room.playersById.get(id);
    return p && typeof p.avatarUrl === "string" && p.avatarUrl.length > 0;
  });
}

export function startRound(room: Room) {
  const activePlayers = room.playerOrder.filter((id) => {
    const p = room.playersById.get(id);
    return p?.connected && !p.isSpectator;
  });
  const players = activePlayers.length ? activePlayers : playingPlayerIdsInOrder(room);
  const playerIdsForRound =
    players.length > 0 ? players : room.playerOrder.filter((id) => room.playersById.has(id));
  const prompts = pickPrompts(playerIdsForRound.length, room.usedPrompts);
  const order = computeRevealOrder(room, playerIdsForRound, room.round);

  const promptByPlayer = new Map<PlayerId, string>();
  playerIdsForRound.forEach((pid, idx) => promptByPlayer.set(pid, prompts[idx]));

  room.drawings = order.map((drawerId) => ({
    drawerId,
    prompt: promptByPlayer.get(drawerId) ?? prompts[0]!
  }));

  room.drawingIndex = 0;
  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.reveal = undefined;
  room.phase = "draw";
}

export function submitDrawing(room: Room, drawerId: PlayerId, imageDataUrl: string) {
  const drawing = room.drawings.find((d) => d.drawerId === drawerId);
  if (!drawing) return;
  drawing.imageDataUrl = imageDataUrl;
}

export function allDrawingsSubmitted(room: Room): boolean {
  return room.drawings.length > 0 && room.drawings.every((d) => typeof d.imageDataUrl === "string" && d.imageDataUrl.length > 0);
}

export function beginClueSubmit(room: Room) {
  room.phase = "submit";
  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.reveal = undefined;
}

export function submitClue(room: Room, playerId: PlayerId, text: string) {
  room.clueByPlayerId.set(playerId, text.trim().slice(0, 80));
}

export function allCluesSubmitted(room: Room): boolean {
  const cur = room.drawings[room.drawingIndex];
  if (!cur) return false;
  const voters = listPlayers(room).filter((p) => p.id !== cur.drawerId && !p.isSpectator);
  return voters.length > 0 && voters.every((p) => room.clueByPlayerId.has(p.id));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function beginVote(room: Room) {
  const cur = room.drawings[room.drawingIndex];
  if (!cur?.imageDataUrl) return;

  const options: Option[] = [];
  options.push({ id: nanoid(10), text: cur.prompt, authorId: null });
  for (const [authorId, text] of room.clueByPlayerId.entries()) {
    if (authorId === cur.drawerId) continue;
    options.push({ id: nanoid(10), text, authorId });
  }

  if (room.useExtraPrompt) {
    const activePrompts = new Set(room.drawings.map(d => d.prompt));
    for (const opt of options) activePrompts.add(opt.text);

    // Attempt to pick a prompt not used in the game so far
    let extraPrompt = "A mysterious extra prompt";
    const availablePrompts = pickPrompts(1, room.usedPrompts);
    if (availablePrompts.length > 0 && !activePrompts.has(availablePrompts[0]!)) {
      extraPrompt = availablePrompts[0]!;
    } else {
      // Fallback
      const fallback = pickPrompts(50).filter(p => !activePrompts.has(p));
      if (fallback.length > 0) extraPrompt = fallback[0]!;
    }
    options.push({ id: nanoid(10), text: extraPrompt, authorId: "system" });
  }

  room.options = shuffle(options);
  room.voteByVoterId.clear();
  room.phase = "vote";
}

export function castVote(room: Room, voterId: PlayerId, optionId: string) {
  room.voteByVoterId.set(voterId, optionId);
}

export function allVotesCast(room: Room): boolean {
  const cur = room.drawings[room.drawingIndex];
  if (!cur) return false;
  const voters = listPlayers(room).filter((p) => p.id !== cur.drawerId && !p.isSpectator);
  return voters.length > 0 && voters.every((p) => room.voteByVoterId.has(p.id));
}

export function scoreAndReveal(room: Room) {
  const cur = room.drawings[room.drawingIndex];
  if (!cur?.imageDataUrl) return;

  const drawerId = cur.drawerId;
  const realOption = room.options.find((o) => o.authorId === null);
  if (!realOption) return;

  const voters = listPlayers(room).filter((p) => p.id !== drawerId && !p.isSpectator);
  const correctVoters = voters.filter((v) => room.voteByVoterId.get(v.id) === realOption.id);

  const pointsDeltaByPlayer: Record<PlayerId, number> = {};
  for (const p of listPlayers(room)) pointsDeltaByPlayer[p.id] = 0;

  // Dixit scoring for the "storyteller" == drawer.
  const allCorrect = correctVoters.length === voters.length && voters.length > 0;
  const noneCorrect = correctVoters.length === 0;
  if (allCorrect || noneCorrect) {
    pointsDeltaByPlayer[drawerId] += 0;
    for (const v of voters) pointsDeltaByPlayer[v.id] += 2;
  } else {
    pointsDeltaByPlayer[drawerId] += 3;
    for (const v of correctVoters) pointsDeltaByPlayer[v.id] += 3;
  }

  // +1 per vote your fake clue receives
  for (const v of voters) {
    const chosen = room.voteByVoterId.get(v.id);
    if (!chosen) continue;
    const opt = room.options.find((o) => o.id === chosen);
    if (!opt) continue;
    if (opt.authorId && opt.authorId !== drawerId) {
      pointsDeltaByPlayer[opt.authorId] += 1;
    }
  }

  // Apply deltas
  for (const [pid, delta] of Object.entries(pointsDeltaByPlayer)) {
    const p = room.playersById.get(pid);
    if (p) p.score += delta;
  }

  const optionVotes: Array<{ id: string; text: string; authorId: PlayerId | null; votes: PlayerId[] }> = room.options.map((o) => ({
    id: o.id,
    text: o.text,
    authorId: o.authorId,
    votes: []
  }));
  for (const v of voters) {
    const chosen = room.voteByVoterId.get(v.id);
    const ov = optionVotes.find((x) => x.id === chosen);
    if (ov) ov.votes.push(v.id);
  }

  room.reveal = {
    drawingIndex: room.drawingIndex,
    drawerId,
    prompt: cur.prompt,
    imageDataUrl: cur.imageDataUrl,
    options: optionVotes,
    pointsDeltaByPlayer,
    totalDrawings: room.drawings.length
  };
  room.phase = "reveal";
}

export function advance(room: Room) {
  if (room.gameType === "fake_artist") {
    if (room.round < room.totalRounds) {
      room.round += 1;
      beginFakeArtistRound(room);
    } else {
      room.phase = "game_over";
    }
    return;
  }

  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.reveal = undefined;

  room.drawingIndex += 1;
  if (room.drawingIndex >= room.drawings.length) {
    if (room.round < room.totalRounds) {
      room.round += 1;
      startRound(room);
    } else {
      room.phase = "game_over";
    }
  } else {
    room.phase = "submit";
  }
}

