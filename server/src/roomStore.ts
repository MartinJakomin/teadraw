import { nanoid } from "nanoid";
import type { Drawing, Option, Phase, Player, PlayerId, Reveal, RoomCode, RoomStatePublic, StrokeEvent } from "./gameTypes.js";
import { pickPrompts, generateSmartDecoyPrompt } from "./prompts.js";

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
  drawTimerSeconds?: number;
  submitTimerSeconds?: number;
  voteTimerSeconds?: number;
  useExtraPrompt: boolean;
  useRandomTricks: boolean;
  sameTrickForAll: boolean;
  finalChaosRound: boolean;
  fakeArtistInkLimit: boolean;
  fakeArtistInkBudget: number;
  fakeArtistWordPack: string;
  fakeArtistHighlight: boolean;
  fakeArtistRandomizeOrder: boolean;
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
  likedOptionIdsByVoterId: Map<PlayerId, string[]>;
  comedyLikesReceived: Map<PlayerId, number>;
  reveal?: Reveal;
  usedPrompts: Set<string>;

  allDrawingsHistory: import("./gameTypes.js").GalleryItem[];
  fakeVotesTricked: Map<PlayerId, number>;
  correctPromptsGuessed: Map<PlayerId, number>;
  fakePromptsFooledBy: Map<PlayerId, number>;
  artistRealVotes: Map<PlayerId, number>;

  // Fake Artist specific
  questionMasterId?: PlayerId;
  fakeArtistId?: PlayerId;
  category?: string;
  word?: string;
  activePlayerId?: PlayerId;
  turnNumber: number;
  sharedDrawingUrl?: string;
  /** Authoritative list of strokes for highlighting. */
  fakeArtistStrokeLog: StrokeEvent[];
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
    useRandomTricks: false,
    sameTrickForAll: false,
    finalChaosRound: false,
    fakeArtistInkLimit: false,
    fakeArtistInkBudget: 600,
    fakeArtistWordPack: "all",
    lockColors: false,
    revealOrder: "random",
    fakeArtistHighlight: true,
    fakeArtistRandomizeOrder: false,
    botCount: 0,
    drawings: [],
    drawingIndex: 0,
    clueByPlayerId: new Map(),
    options: [],
    voteByVoterId: new Map(),
    likedOptionIdsByVoterId: new Map(),
    comedyLikesReceived: new Map(),
    votedForId: new Map(),
    usedPrompts: new Set(),
    allDrawingsHistory: [],
    fakeVotesTricked: new Map(),
    correctPromptsGuessed: new Map(),
    fakePromptsFooledBy: new Map(),
    artistRealVotes: new Map(),
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
  const currentDrawing = room.drawings[room.drawingIndex];
  const players = listPlayers(room).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    connected: p.connected,
    color: p.color,
    avatarUrl: p.avatarUrl,
    isBot: p.isBot,
    isSpectator: p.isSpectator
  }));

  const base: RoomStatePublic = {
    roomCode: room.roomCode,
    hostId: room.hostId,
    phase: room.phase,
    gameType: room.gameType,
    round: room.round,
    totalRounds: room.totalRounds,
    timerSeconds: room.timerSeconds,
    drawTimerSeconds: room.drawTimerSeconds,
    submitTimerSeconds: room.submitTimerSeconds,
    voteTimerSeconds: room.voteTimerSeconds,
    useExtraPrompt: room.useExtraPrompt,
    useRandomTricks: room.useRandomTricks,
    sameTrickForAll: room.sameTrickForAll,
    finalChaosRound: room.finalChaosRound,
    fakeArtistInkLimit: room.fakeArtistInkLimit,
    fakeArtistInkBudget: room.fakeArtistInkBudget,
    fakeArtistWordPack: room.fakeArtistWordPack,
    lockColors: room.lockColors,
    revealOrder: room.revealOrder,
    fakeArtistHighlight: room.fakeArtistHighlight,
    fakeArtistRandomizeOrder: room.fakeArtistRandomizeOrder,
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
      prompt: currentDrawing.prompt,
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

  if (room.phase === "game_over") {
    base.gallery = room.allDrawingsHistory;

    const accolades: import("./gameTypes.js").Accolade[] = [];
    const allPlayers = [...room.playersById.values()].filter(p => !p.isSpectator && !p.isBot);

    // Master Bluffer: most fake votes fooled
    const topBluffer = allPlayers.reduce<{ id: PlayerId; count: number } | null>((best, p) => {
      const c = room.fakeVotesTricked.get(p.id) || 0;
      return !best || c > best.count ? { id: p.id, count: c } : best;
    }, null);
    if (topBluffer && topBluffer.count > 0) {
      const p = room.playersById.get(topBluffer.id)!;
      accolades.push({ title: "Master Bluffer", icon: "🎭", playerName: p.name, playerColor: p.color, description: `Fooled ${topBluffer.count} vote${topBluffer.count !== 1 ? 's' : ''} with fake prompts!` });
    }

    // Eagle Eye: most correct guesses
    const topGuesser = allPlayers.reduce<{ id: PlayerId; count: number } | null>((best, p) => {
      const c = room.correctPromptsGuessed.get(p.id) || 0;
      return !best || c > best.count ? { id: p.id, count: c } : best;
    }, null);
    if (topGuesser && topGuesser.count > 0) {
      const p = room.playersById.get(topGuesser.id)!;
      accolades.push({ title: "Eagle Eye", icon: "🦅", playerName: p.name, playerColor: p.color, description: `Correctly guessed ${topGuesser.count} prompt${topGuesser.count !== 1 ? 's' : ''}!` });
    }

    // Picasso: drawer who got the most real votes
    const topArtist = allPlayers.reduce<{ id: PlayerId; count: number } | null>((best, p) => {
      const c = room.artistRealVotes.get(p.id) || 0;
      return !best || c > best.count ? { id: p.id, count: c } : best;
    }, null);
    if (topArtist && topArtist.count > 0) {
      const p = room.playersById.get(topArtist.id)!;
      accolades.push({ title: "Picasso", icon: "🎨", playerName: p.name, playerColor: p.color, description: `Drew so well, ${topArtist.count} people guessed correctly!` });
    }

    // Gullible Genius: fooled by the most fake prompts
    const topFooled = allPlayers.reduce<{ id: PlayerId; count: number } | null>((best, p) => {
      const c = room.fakePromptsFooledBy.get(p.id) || 0;
      return !best || c > best.count ? { id: p.id, count: c } : best;
    }, null);
    if (topFooled && topFooled.count > 0) {
      const p = room.playersById.get(topFooled.id)!;
      accolades.push({ title: "Gullible Genius", icon: "🤡", playerName: p.name, playerColor: p.color, description: `Fell for ${topFooled.count} fake prompt${topFooled.count !== 1 ? 's' : ''}!` });
    }

    // Class Clown: received the most comedy likes on fake prompts
    const topClown = allPlayers.reduce<{ id: PlayerId; count: number } | null>((best, p) => {
      const c = room.comedyLikesReceived.get(p.id) || 0;
      return !best || c > best.count ? { id: p.id, count: c } : best;
    }, null);
    if (topClown && topClown.count > 0) {
      const p = room.playersById.get(topClown.id)!;
      accolades.push({ title: "Class Clown", icon: "😂", playerName: p.name, playerColor: p.color, description: `Earned ${topClown.count} comedy like${topClown.count !== 1 ? 's' : ''} for hilarious fake prompts!` });
    }

    if (accolades.length > 0) {
      base.accolades = accolades;
    }
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
      fa.strokeLog = room.fakeArtistStrokeLog;
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

export function kickPlayer(room: Room, kickedId: PlayerId): { ok: boolean; error?: string } {
  const p = room.playersById.get(kickedId);
  if (!p) return { ok: false, error: "Player not found." };
  if (room.hostId === kickedId) return { ok: false, error: "Cannot kick the host." };

  const wasActiveInFakeArtistDraw = room.gameType === "fake_artist" && room.phase === "draw_shared" && room.activePlayerId === kickedId;
  let nextActiveId: PlayerId | undefined;
  if (wasActiveInFakeArtistDraw) {
    const artists = getFakeArtistArtistOrder(room);
    const idx = artists.indexOf(kickedId);
    if (idx !== -1 && artists.length > 1) {
      const nextIdx = (idx + 1) % artists.length;
      nextActiveId = artists[nextIdx] === kickedId ? undefined : artists[nextIdx];
    }
  }

  // Remove player
  room.playersById.delete(kickedId);
  room.playerOrder = room.playerOrder.filter((id) => id !== kickedId);

  // Clean up clues/votes
  room.clueByPlayerId.delete(kickedId);
  room.voteByVoterId.delete(kickedId);
  room.votedForId.delete(kickedId);

  // Remove drawing
  if (room.gameType === "drawful") {
    room.drawings = room.drawings.filter((d) => d.drawerId !== kickedId);
    if (room.drawingIndex >= room.drawings.length) {
      room.drawingIndex = Math.max(0, room.drawings.length - 1);
    }
  }

  // Update Fake Artist active player
  if (wasActiveInFakeArtistDraw) {
    const newArtists = getFakeArtistArtistOrder(room);
    if (nextActiveId && newArtists.includes(nextActiveId)) {
      room.activePlayerId = nextActiveId;
    } else if (newArtists.length > 0) {
      room.activePlayerId = newArtists[0];
    } else {
      room.activePlayerId = undefined;
    }
  }

  // Return to lobby if needed
  if (room.phase !== "lobby" && room.phase !== "game_over") {
    const activePlayers = listPlayers(room).filter((pl) => pl.connected && !pl.isSpectator);
    const minPlayers = room.gameType === "fake_artist" ? 3 : 2;
    const criticalRoleKicked = room.gameType === "fake_artist" && (room.fakeArtistId === kickedId || room.questionMasterId === kickedId);

    if (activePlayers.length < minPlayers || criticalRoleKicked) {
      ensureLobby(room);
    }
  }

  return { ok: true };
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
  room.allDrawingsHistory = [];
  room.fakeVotesTricked.clear();
  room.correctPromptsGuessed.clear();
  room.fakePromptsFooledBy.clear();
  room.artistRealVotes.clear();
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

export function startGame(room: Room, options: { gameType?: "drawful" | "fake_artist"; totalRounds?: number; revealOrder?: "random" | "round_robin"; timerSeconds?: number; drawTimerSeconds?: number; submitTimerSeconds?: number; voteTimerSeconds?: number; useExtraPrompt?: boolean; useRandomTricks?: boolean; sameTrickForAll?: boolean; finalChaosRound?: boolean; fakeArtistInkLimit?: boolean; fakeArtistInkBudget?: number; fakeArtistWordPack?: string; lockColors?: boolean; fakeArtistHighlight?: boolean; fakeArtistRandomizeOrder?: boolean }) {
  room.round = 1;
  room.gameType = options.gameType || "drawful";
  room.totalRounds = options.totalRounds !== undefined ? options.totalRounds : room.totalRounds;
  room.timerSeconds = options.timerSeconds !== undefined ? options.timerSeconds : room.timerSeconds;
  room.drawTimerSeconds = options.drawTimerSeconds !== undefined ? options.drawTimerSeconds : room.drawTimerSeconds;
  room.submitTimerSeconds = options.submitTimerSeconds !== undefined ? options.submitTimerSeconds : room.submitTimerSeconds;
  room.voteTimerSeconds = options.voteTimerSeconds !== undefined ? options.voteTimerSeconds : room.voteTimerSeconds;
  room.useExtraPrompt = options.useExtraPrompt || false;
  room.useRandomTricks = options.useRandomTricks || false;
  room.sameTrickForAll = options.sameTrickForAll || false;
  room.finalChaosRound = options.finalChaosRound || false;
  room.fakeArtistInkLimit = options.fakeArtistInkLimit || false;
  room.fakeArtistInkBudget = options.fakeArtistInkBudget || 600;
  room.fakeArtistWordPack = options.fakeArtistWordPack || "all";
  room.lockColors = options.lockColors || false;
  room.fakeArtistHighlight = options.fakeArtistHighlight !== undefined ? options.fakeArtistHighlight : true;
  room.fakeArtistRandomizeOrder = options.fakeArtistRandomizeOrder || false;
  room.revealOrder = options.revealOrder || "random";
  room.usedPrompts.clear();
  room.allDrawingsHistory = [];
  room.fakeVotesTricked.clear();
  room.correctPromptsGuessed.clear();
  room.fakePromptsFooledBy.clear();
  room.artistRealVotes.clear();
  room.comedyLikesReceived.clear();

  // Reset scores
  for (const p of room.playersById.values()) {
    p.score = 0;
  }

  // Shuffle playerOrder once at start of fake artist if setting is active
  if (room.gameType === "fake_artist" && room.fakeArtistRandomizeOrder) {
    room.playerOrder = shuffle(room.playerOrder);
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
  const pids = room.playerOrder.filter((id) => {
    const p = room.playersById.get(id);
    return p && !p.isSpectator;
  });
  if (pids.length < 2) return;

  const qmIndex = (room.round - 1) % pids.length;
  room.questionMasterId = pids[qmIndex];

  const artistPids = pids.filter((id) => id !== room.questionMasterId);
  const fakeIndex = Math.floor(Math.random() * artistPids.length);
  room.fakeArtistId = artistPids[fakeIndex];

  room.category = undefined;
  room.word = undefined;
  room.activePlayerId = undefined;
  room.turnNumber = 0;
  room.sharedDrawingUrl = undefined;
  room.fakeArtistStrokeLog = [];
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

  // Save the collaborative drawing to match gallery history
  if (room.sharedDrawingUrl) {
    const qm = room.playersById.get(room.questionMasterId!);
    const fakeArtist = room.playersById.get(room.fakeArtistId!);
    const title = room.word ? `${room.word} (${room.category || "Fake Artist"})` : "Collaborative Masterpiece";
    const drawerLabel = fakeArtist?.name
      ? `Collaborative (Fake: ${fakeArtist.name})`
      : (qm?.name ? `Collaborative (QM: ${qm.name})` : "Collaborative Artists");

    room.allDrawingsHistory.push({
      drawerId: room.fakeArtistId || "shared",
      drawerName: drawerLabel,
      drawerColor: fakeArtist?.color || "#6366f1",
      prompt: title,
      imageDataUrl: room.sharedDrawingUrl
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

  const isChaosRound = Boolean(room.finalChaosRound && room.round === room.totalRounds);
  const sharedChaosPrompt = prompts[0]!;

  const promptByPlayer = new Map<PlayerId, string>();
  playerIdsForRound.forEach((pid, idx) => {
    promptByPlayer.set(pid, isChaosRound ? sharedChaosPrompt : prompts[idx]!);
  });

  const tricks: Array<import("./gameTypes.js").TrickType> = ["blind", "one_stroke", "large_brush", "tiny_brush", "half_time", "upside_down", "wobble", "mirror", "ink_limit"];
  const sharedTrick = tricks[Math.floor(Math.random() * tricks.length)];

  room.drawings = order.map((drawerId) => {
    const trick = (isChaosRound || !room.useRandomTricks)
      ? undefined
      : room.sameTrickForAll
      ? sharedTrick
      : tricks[Math.floor(Math.random() * tricks.length)];
    return {
      drawerId,
      prompt: promptByPlayer.get(drawerId) ?? prompts[0]!,
      trick
    };
  });

  room.drawingIndex = 0;
  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.likedOptionIdsByVoterId.clear();
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

export function advanceAfterDraw(room: Room) {
  const isChaos = Boolean(room.finalChaosRound && room.round === room.totalRounds);
  if (isChaos) {
    beginVote(room);
  } else {
    beginClueSubmit(room);
  }
}

export function beginClueSubmit(room: Room) {
  room.phase = "submit";
  room.clueByPlayerId.clear();
  room.options = [];
  room.voteByVoterId.clear();
  room.likedOptionIdsByVoterId.clear();
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

  const isChaos = Boolean(room.finalChaosRound && room.round === room.totalRounds);
  const options: Option[] = [];

  if (isChaos) {
    // In Chaos Round: everyone drew the same prompt, so players vote on WHO drew this masterpiece!
    const activePlayers = listPlayers(room).filter((p) => !p.isSpectator);
    for (const p of activePlayers) {
      options.push({
        id: p.id,
        text: p.name,
        authorId: p.id === cur.drawerId ? null : p.id
      });
    }
  } else {
    options.push({ id: nanoid(10), text: cur.prompt, authorId: null });
    for (const [authorId, text] of room.clueByPlayerId.entries()) {
      if (authorId === cur.drawerId) continue;
      options.push({ id: nanoid(10), text, authorId });
    }

    if (room.useExtraPrompt) {
      const activePrompts = new Set(room.drawings.map((d) => d.prompt));
      for (const opt of options) activePrompts.add(opt.text);

      const extraPrompt = generateSmartDecoyPrompt(cur.prompt, activePrompts, room.usedPrompts);
      options.push({ id: nanoid(10), text: extraPrompt, authorId: "system" });
    }
  }

  room.options = shuffle(options);
  room.voteByVoterId.clear();
  room.likedOptionIdsByVoterId.clear();
  room.phase = "vote";
}

export function castVote(room: Room, voterId: PlayerId, optionId: string, likedOptionIds?: string[]) {
  room.voteByVoterId.set(voterId, optionId);
  if (likedOptionIds && Array.isArray(likedOptionIds)) {
    room.likedOptionIdsByVoterId.set(voterId, likedOptionIds);
  }
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

  const isChaos = Boolean(room.finalChaosRound && room.round === room.totalRounds);
  const voters = listPlayers(room).filter((p) => p.id !== drawerId && !p.isSpectator);
  const correctVoters = voters.filter((v) => room.voteByVoterId.get(v.id) === realOption.id);

  const pointsDeltaByPlayer: Record<PlayerId, number> = {};
  for (const p of listPlayers(room)) pointsDeltaByPlayer[p.id] = 0;

  if (isChaos) {
    // Chaos Round scoring: Guessing the artist correctly
    for (const v of correctVoters) {
      pointsDeltaByPlayer[v.id] += 3;
      room.correctPromptsGuessed.set(v.id, (room.correctPromptsGuessed.get(v.id) || 0) + 1);
    }
    // Drawer gets +2 pts per player who recognized their art
    pointsDeltaByPlayer[drawerId] += correctVoters.length * 2;
    if (correctVoters.length > 0) {
      room.artistRealVotes.set(drawerId, (room.artistRealVotes.get(drawerId) || 0) + correctVoters.length);
    }

    // Fooled votes: if you voted for someone else, they get +1 bluff pt
    for (const v of voters) {
      const chosen = room.voteByVoterId.get(v.id);
      if (!chosen || chosen === realOption.id) continue;
      const opt = room.options.find((o) => o.id === chosen);
      if (opt?.authorId && opt.authorId !== drawerId) {
        pointsDeltaByPlayer[opt.authorId] += 1;
        room.fakeVotesTricked.set(opt.authorId, (room.fakeVotesTricked.get(opt.authorId) || 0) + 1);
        room.fakePromptsFooledBy.set(v.id, (room.fakePromptsFooledBy.get(v.id) || 0) + 1);
      }
    }
  } else {
    // Dixit scoring for normal Drawful
    const allCorrect = correctVoters.length === voters.length && voters.length > 0;
    const noneCorrect = correctVoters.length === 0;
    if (allCorrect || noneCorrect) {
      pointsDeltaByPlayer[drawerId] += 0;
      for (const v of voters) pointsDeltaByPlayer[v.id] += 2;
    } else {
      pointsDeltaByPlayer[drawerId] += 3;
      for (const v of correctVoters) pointsDeltaByPlayer[v.id] += 3;
    }

    if (correctVoters.length > 0) {
      room.artistRealVotes.set(drawerId, (room.artistRealVotes.get(drawerId) || 0) + correctVoters.length);
      for (const v of correctVoters) {
        room.correctPromptsGuessed.set(v.id, (room.correctPromptsGuessed.get(v.id) || 0) + 1);
      }
    }

    // +1 per vote your fake clue receives
    for (const v of voters) {
      const chosen = room.voteByVoterId.get(v.id);
      if (!chosen) continue;
      const opt = room.options.find((o) => o.id === chosen);
      if (!opt) continue;
      if (opt.authorId && opt.authorId !== drawerId) {
        pointsDeltaByPlayer[opt.authorId] += 1;
        room.fakeVotesTricked.set(opt.authorId, (room.fakeVotesTricked.get(opt.authorId) || 0) + 1);
        room.fakePromptsFooledBy.set(v.id, (room.fakePromptsFooledBy.get(v.id) || 0) + 1);
      }
    }
  }

  // Comedy Award Likes (Track tally for accolades, but keep away from main scores)
  for (const [voterId, likedIds] of room.likedOptionIdsByVoterId.entries()) {
    for (const likedId of likedIds) {
      const opt = room.options.find((o) => o.id === likedId);
      if (!opt) continue;
      if (opt.authorId && opt.authorId !== "system" && opt.authorId !== drawerId) {
        room.comedyLikesReceived.set(opt.authorId, (room.comedyLikesReceived.get(opt.authorId) || 0) + 1);
      }
    }
  }

  // Apply deltas
  for (const [pid, delta] of Object.entries(pointsDeltaByPlayer)) {
    const p = room.playersById.get(pid);
    if (p) p.score += delta;
  }

  const optionVotes: Array<{ id: string; text: string; authorId: PlayerId | null; votes: PlayerId[]; likes?: PlayerId[] }> = room.options.map((o) => ({
    id: o.id,
    text: o.text,
    authorId: o.authorId,
    votes: [],
    likes: []
  }));
  for (const v of voters) {
    const chosen = room.voteByVoterId.get(v.id);
    const ov = optionVotes.find((x) => x.id === chosen);
    if (ov) ov.votes.push(v.id);
  }
  for (const [voterId, likedIds] of room.likedOptionIdsByVoterId.entries()) {
    for (const likedId of likedIds) {
      const ov = optionVotes.find((x) => x.id === likedId);
      if (ov) {
        if (!ov.likes) ov.likes = [];
        if (!ov.likes.includes(voterId)) {
          ov.likes.push(voterId);
        }
      }
    }
  }

  const drawerPlayer = room.playersById.get(drawerId);
  room.allDrawingsHistory.push({
    drawerId,
    drawerName: drawerPlayer?.name ?? "Unknown",
    drawerColor: drawerPlayer?.color ?? "#ffffff",
    prompt: cur.prompt,
    imageDataUrl: cur.imageDataUrl
  });

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
  room.likedOptionIdsByVoterId.clear();
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
    const isChaos = Boolean(room.finalChaosRound && room.round === room.totalRounds);
    if (isChaos) {
      beginVote(room);
    } else {
      room.phase = "submit";
    }
  }
}
