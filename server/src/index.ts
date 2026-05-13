import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import type { Player } from "./gameTypes.js";
import {
  advance,
  allCluesSubmitted,
  allDrawingsSubmitted,
  allVotesCast,
  beginClueSubmit,
  beginVote,
  castVote,
  createRoom,
  getRoom,
  listPlayers,
  maybeReassignHost,
  scoreAndReveal,
  setConnected,
  startGame,
  submitClue,
  submitDrawing,
  toPublicState,
  upsertPlayer,
  clearRoomTimer,
  submitAvatar,
  allAvatarsSubmitted,
  startRound,
  beginRound,
  resolveFakeArtistRound,
  ensureLobby
} from "./roomStore.js";
import { pickPrompts } from "./prompts.js";

const COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

function getRandomColor(usedColors: string[] = []) {
  const available = COLORS.filter(c => !usedColors.includes(c));
  const palette = available.length > 0 ? available : COLORS;
  return palette[Math.floor(Math.random() * palette.length)]!;
}

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root dir is two levels up from server/src or server/dist
const rootDir = path.resolve(__dirname, "../..");
const clientDistDir = path.join(rootDir, "client/dist");

let serverVersion = "1.0.0";
try {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  if (pkg.version) serverVersion = pkg.version;
} catch (e) {
  try {
    const pkgPath = path.join(path.resolve(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (pkg.version) serverVersion = pkg.version;
  } catch (e2) { }
}

// eslint-disable-next-line no-console
console.log(`Server version: ${serverVersion}`);

app.get("/api/version", (_req, res) => res.json({ version: serverVersion }));

// Hashed assets (JS, CSS, images) – safe to cache forever because the filename changes on each build
app.use(
  "/assets",
  express.static(path.join(clientDistDir, "assets"), {
    maxAge: "1d",
    immutable: true
  })
);

// Everything else (including index.html) – always revalidate so browsers pick up new asset names
app.use(
  express.static(clientDistDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  })
);

app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(clientDistDir, "index.html"));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

function emitRoom(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room:state", toPublicState(room));
}

function emitPrompts(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;
  for (const p of listPlayers(room)) {
    const d = room.drawings.find((x) => x.drawerId === p.id);
    if (d) io.to(p.socketId).emit("prompt:you", { prompt: d.prompt });
  }
}

function triggerBotActions(room: NonNullable<ReturnType<typeof getRoom>>) {
  const bots = listPlayers(room).filter(p => p.isBot);
  if (bots.length === 0) return;

  const delay = () => Math.floor(Math.random() * 2000) + 1000;

  bots.forEach(bot => {
    setTimeout(() => {
      const r = getRoom(room.roomCode);
      if (!r || r.phase !== room.phase) return;

      if (r.phase === "avatar") {
        if (r.playersById.get(bot.id)?.avatarUrl) return;
        const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23${bot.color.replace('#', '')}"/><text x="200" y="200" font-size="40" text-anchor="middle" fill="white">BOT</text></svg>`;
        submitAvatar(r, bot.id, svg, bot.color);
        if (allAvatarsSubmitted(r)) {
          beginRound(r);
          setupPhaseTimer(r);
          emitPrompts(r.roomCode);
          triggerBotActions(r);
        }
        emitRoom(r.roomCode);
      } else if (r.phase === "draw") {
        const drawing = r.drawings.find(d => d.drawerId === bot.id);
        if (!drawing || drawing.imageDataUrl) return;
        const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23${bot.color.replace('#', '')}"/><text x="200" y="200" font-size="20" text-anchor="middle" fill="white">${encodeURIComponent(drawing.prompt)}</text></svg>`;
        submitDrawing(r, bot.id, svg);
        if (allDrawingsSubmitted(r)) {
          beginClueSubmit(r);
          setupPhaseTimer(r);
          triggerBotActions(r);
        }
        emitRoom(r.roomCode);
      } else if (r.phase === "submit") {
        if (r.clueByPlayerId.has(bot.id)) return;
        const cur = r.drawings[r.drawingIndex];
        if (cur?.drawerId === bot.id) return;
        const fakeClue = bot.name;
        submitClue(r, bot.id, fakeClue);
        if (allCluesSubmitted(r)) {
          beginVote(r);
          setupPhaseTimer(r);
          triggerBotActions(r);
        }
        emitRoom(r.roomCode);
      } else if (r.phase === "vote") {
        if (r.voteByVoterId.has(bot.id)) return;
        const cur = r.drawings[r.drawingIndex];
        if (cur?.drawerId === bot.id) return;
        const opts = r.options.filter(o => o.authorId !== bot.id);
        const choice = opts[Math.floor(Math.random() * opts.length)];
        if (choice) {
          castVote(r, bot.id, choice.id);
          if (allVotesCast(r)) {
            scoreAndReveal(r);
            setupPhaseTimer(r);
            triggerBotActions(r);
          }
          emitRoom(r.roomCode);
        }
        emitRoom(r.roomCode);
      } else if (r.phase === "category") {
        if (r.questionMasterId !== bot.id) return;
        const categories = ["Animals", "Fruits", "Movies", "Cities"];
        const words = ["Elephant", "Banana", "Matrix", "London"];
        const idx = Math.floor(Math.random() * categories.length);
        const category = categories[idx]!;
        const word = words[idx]!;

        // Emit via socket logic equivalent
        r.category = category;
        r.word = word;
        r.phase = "draw_shared";
        const artists = r.playerOrder.filter(id => id !== r.questionMasterId);
        r.activePlayerId = artists[0];
        r.turnNumber = 1;
        emitRoom(r.roomCode);
      } else if (r.phase === "draw_shared") {
        if (r.activePlayerId !== bot.id) return;
        const x1 = Math.random() * 800;
        const y1 = Math.random() * 500;
        const x2 = Math.random() * 800;
        const y2 = Math.random() * 500;

        const isSvg = r.sharedDrawingUrl?.startsWith('data:image/svg+xml');
        let newSvgUrl = "";

        if (isSvg) {
          const oldSvg = decodeURIComponent(r.sharedDrawingUrl!.split(',')[1]!);
          const line = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${bot.color}" stroke-width="8" stroke-linecap="round" />`;
          newSvgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(oldSvg.replace('</svg>', line + '</svg>'))}`;
        } else {
          // If it was a PNG or empty, include it as an <image> tag in a new SVG
          const line = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${bot.color}" stroke-width="8" stroke-linecap="round" />`;
          const prevImgTag = r.sharedDrawingUrl ? `<image href="${r.sharedDrawingUrl}" width="800" height="500" />` : '';
          const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">${prevImgTag}${line}</svg>`;
          newSvgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
        }

        r.sharedDrawingUrl = newSvgUrl;
        r.turnNumber++;
        const artists = r.playerOrder.filter(id => id !== r.questionMasterId);
        if (r.turnNumber > artists.length * 2) {
          r.phase = "accuse";
          r.activePlayerId = undefined;
        } else {
          const currentArtistIndex = artists.indexOf(bot.id);
          r.activePlayerId = artists[(currentArtistIndex + 1) % artists.length];
        }
        emitRoom(r.roomCode);
        triggerBotActions(r);
      } else if (r.phase === "accuse") {
        if (r.votedForId.has(bot.id) || r.questionMasterId === bot.id) return;
        const artists = r.playerOrder.filter(id => id !== r.questionMasterId);
        const targets = artists.filter(id => id !== bot.id);
        const targetId = targets[Math.floor(Math.random() * targets.length)]!;
        r.votedForId.set(bot.id, targetId);

        if (r.votedForId.size >= artists.length) {
          const votes: Record<string, number> = {};
          r.votedForId.forEach(tid => votes[tid] = (votes[tid] || 0) + 1);
          let maxVotes = 0;
          let caughtId = "";
          for (const [id, count] of Object.entries(votes)) {
            if (count > maxVotes) {
              maxVotes = count;
              caughtId = id;
            }
          }
          r.isFakeArtistCaught = (caughtId === r.fakeArtistId);
          if (r.isFakeArtistCaught) {
            r.phase = "guess";
          } else {
            resolveFakeArtistRound(r, true);
            r.phase = "reveal_fake";
          }
          setupPhaseTimer(r);
        }
        emitRoom(r.roomCode);
        triggerBotActions(r);
      } else if (r.phase === "guess") {
        if (r.fakeArtistId !== bot.id) return;
        r.fakeArtistGuess = "I don't know!";
        const isCorrect = false;
        resolveFakeArtistRound(r, isCorrect);
        r.phase = "reveal_fake";
        emitRoom(r.roomCode);
      }
    }, delay());
  });
}

function setupPhaseTimer(room: NonNullable<ReturnType<typeof getRoom>>) {
  clearRoomTimer(room);
  if (!room.timerSeconds) return;

  let durationSeconds = 0;
  if (room.phase === "draw" || room.phase === "avatar") durationSeconds = room.timerSeconds;
  else if (room.phase === "submit" || room.phase === "vote") durationSeconds = Math.max(15, Math.floor(room.timerSeconds / 2));
  else if (room.phase === "category") durationSeconds = 30;
  else if (room.phase === "draw_shared") durationSeconds = room.timerSeconds;
  else if (room.phase === "accuse") durationSeconds = Math.max(20, room.timerSeconds);
  else if (room.phase === "guess") durationSeconds = 30;
  else return;

  room.endTime = Date.now() + durationSeconds * 1000;
  room.timeoutId = setTimeout(() => {
    // Time's up!
    if (room.phase === "avatar") {
      beginRound(room);
      emitPrompts(room.roomCode);
    } else if (room.phase === "draw") {
      beginClueSubmit(room);
    } else if (room.phase === "submit") {
      beginVote(room);
    } else if (room.phase === "vote") {
      scoreAndReveal(room);
    } else if (room.phase === "category") {
      // Auto-submit some category if QM is AFK
      room.category = "Random";
      room.word = "Banana";
      room.phase = "draw_shared";
      const qmIndex = room.playerOrder.indexOf(room.questionMasterId!);
      const artists = room.playerOrder.filter(id => id !== room.questionMasterId);
      room.activePlayerId = artists[0];
      room.turnNumber = 1;
    } else if (room.phase === "draw_shared") {
      // Skip turn or auto-submit
      room.turnNumber++;
      const artists = room.playerOrder.filter(id => id !== room.questionMasterId);
      if (room.turnNumber > artists.length * 2) {
        room.phase = "accuse";
        room.activePlayerId = undefined;
      } else {
        const currentIdx = artists.indexOf(room.activePlayerId!);
        room.activePlayerId = artists[(currentIdx + 1) % artists.length];
      }
    } else if (room.phase === "accuse") {
      // Auto-end accusation
      const artists = room.playerOrder.filter(id => id !== room.questionMasterId);
      const votes: Record<string, number> = {};
      room.votedForId.forEach(tid => votes[tid] = (votes[tid] || 0) + 1);
      let maxVotes = 0;
      let caughtId = "";
      for (const [id, count] of Object.entries(votes)) {
        if (count > maxVotes) {
          maxVotes = count;
          caughtId = id;
        }
      }
      room.isFakeArtistCaught = (caughtId === room.fakeArtistId);
      if (room.isFakeArtistCaught) {
        room.phase = "guess";
      } else {
        resolveFakeArtistRound(room, true);
        room.phase = "reveal_fake";
      }
    } else if (room.phase === "guess") {
      room.phase = "reveal_fake";
    }
    setupPhaseTimer(room);
    triggerBotActions(room);
    emitRoom(room.roomCode);
  }, durationSeconds * 1000);
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name }: { name: string }, ack?: (resp: any) => void) => {
    const player: Player = {
      id: nanoid(10),
      name: String(name ?? "Player").trim().slice(0, 18) || "Player",
      socketId: socket.id,
      score: 0,
      connected: true,
      color: getRandomColor([])
    };
    const room = createRoom(player);
    socket.join(room.roomCode);
    socket.data.roomCode = room.roomCode;
    socket.data.playerId = player.id;
    ack?.({ ok: true, roomCode: room.roomCode, playerId: player.id });
    emitRoom(room.roomCode);
  });

  socket.on(
    "room:join",
    (
      { roomCode, name, playerId }: { roomCode: string; name: string; playerId?: string },
      ack?: (resp: any) => void
    ) => {
      const code = String(roomCode ?? "").trim().toUpperCase();
      const room = getRoom(code);
      if (!room) {
        ack?.({ ok: false, error: "Room not found" });
        return;
      }

      if (playerId && room.playersById.has(playerId)) {
        // Reconnect
        setConnected(room, playerId, true, socket.id);
        socket.join(code);
        socket.data.roomCode = code;
        socket.data.playerId = playerId;
        const d = room.drawings.find((x) => x.drawerId === playerId);
        if (d) io.to(socket.id).emit("prompt:you", { prompt: d.prompt });
        ack?.({ ok: true, roomCode: code, playerId });
        emitRoom(code);
        return;
      }

      const newPlayer: Player = {
        id: nanoid(10),
        name: String(name ?? "Player").trim().slice(0, 18) || "Player",
        socketId: socket.id,
        score: 0,
        connected: true,
        color: getRandomColor(listPlayers(room).map(p => p.color))
      };
      upsertPlayer(room, newPlayer);
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.playerId = newPlayer.id;
      ack?.({ ok: true, roomCode: code, playerId: newPlayer.id });
      emitRoom(code);
    }
  );

  socket.on("room:leave", ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
    const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
    socket.leave(String(roomCode ?? "").trim().toUpperCase());
    if (!room) return;
    setConnected(room, playerId, false);
    maybeReassignHost(room);
    emitRoom(room.roomCode);
  });



  socket.on(
    "game:start",
    ({ roomCode, playerId, gameType, totalRounds, revealOrder, lockColors }: { roomCode: string; playerId: string; gameType?: "drawful" | "fake_artist"; totalRounds?: number; revealOrder?: "random" | "round_robin"; lockColors?: boolean },
      ack?: (resp: any) => void
    ) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.hostId !== playerId) return ack?.({ ok: false, error: "Only host can start" });
      if (room.phase !== "lobby" && room.phase !== "game_over") return ack?.({ ok: false, error: "Game already running" });

      // Reset scores on a fresh start from game_over as well
      for (const p of room.playersById.values()) p.score = 0;

      const botCount = room.botCount || 0;
      for (const [id, p] of room.playersById.entries()) {
        if (p.isBot) {
          room.playersById.delete(id);
          room.playerOrder = room.playerOrder.filter(x => x !== id);
        }
      }
      for (let i = 0; i < botCount; i++) {
        const botColor = getRandomColor();
        const newBot: Player = {
          id: `bot_${nanoid(5)}`,
          name: `Bot ${i + 1}`,
          socketId: "bot",
          score: 0,
          connected: true,
          color: botColor,
          isBot: true,
          avatarUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23${botColor.replace('#', '')}"/><text x="200" y="200" font-size="40" text-anchor="middle" fill="white">BOT</text></svg>`
        };
        upsertPlayer(room, newBot);
      }

      startGame(room, {
        gameType: gameType || room.gameType,
        totalRounds,
        revealOrder,
        timerSeconds: (room as any).timerSeconds,
        useExtraPrompt: (room as any).useExtraPrompt,
        lockColors: lockColors !== undefined ? lockColors : (room as any).lockColors
      });
      setupPhaseTimer(room);
      emitPrompts(room.roomCode);
      triggerBotActions(room);
      ack?.({ ok: true });
      emitRoom(room.roomCode);
    });

  socket.on("room:stop", ({ roomCode, playerId }: { roomCode: string, playerId: string }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;

    ensureLobby(room);
    emitRoom(roomCode);
  });

  socket.on(
    "room:updateSettings",
    (
      { roomCode, playerId, gameType, totalRounds, revealOrder, timerSeconds, useExtraPrompt, lockColors, botCount }: { roomCode: string; playerId: string; gameType?: "drawful" | "fake_artist"; totalRounds?: number; revealOrder?: "random" | "round_robin"; timerSeconds?: number; useExtraPrompt?: boolean; lockColors?: boolean; botCount?: number },
      ack?: (resp: any) => void
    ) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.hostId !== playerId) return ack?.({ ok: false, error: "Only host can change settings" });
      if (room.phase !== "lobby") return ack?.({ ok: false, error: "Can only change settings in lobby" });

      if (gameType !== undefined) room.gameType = gameType;
      if (totalRounds !== undefined) room.totalRounds = Math.max(1, Math.min(15, Number(totalRounds)));
      if (revealOrder !== undefined) room.revealOrder = revealOrder;
      if (timerSeconds !== undefined) room.timerSeconds = Number(timerSeconds);
      if (useExtraPrompt !== undefined) room.useExtraPrompt = Boolean(useExtraPrompt);
      if (lockColors !== undefined) room.lockColors = Boolean(lockColors);
      if (botCount !== undefined) room.botCount = Number(botCount);

      ack?.({ ok: true });
      emitRoom(room.roomCode);
    }
  );

  socket.on(
    "avatar:submit",
    ({ roomCode, playerId, imageDataUrl, color }: { roomCode: string; playerId: string; imageDataUrl: string; color: string }, ack?: (resp: any) => void) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.phase !== "avatar") return ack?.({ ok: false, error: "Not in avatar phase" });

      submitAvatar(room, playerId, String(imageDataUrl ?? ""), color);
      ack?.({ ok: true });

      if (allAvatarsSubmitted(room)) {
        beginRound(room);
        setupPhaseTimer(room);
        emitPrompts(room.roomCode);
        triggerBotActions(room);
      }
      emitRoom(room.roomCode);
    }
  );

  socket.on(
    "draw:submit",
    ({ roomCode, playerId, imageDataUrl }: { roomCode: string; playerId: string; imageDataUrl: string }, ack?: (resp: any) => void) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.phase !== "draw") return ack?.({ ok: false, error: "Not in draw phase" });

      submitDrawing(room, playerId, String(imageDataUrl ?? ""));
      ack?.({ ok: true });

      if (allDrawingsSubmitted(room)) {
        beginClueSubmit(room);
        setupPhaseTimer(room);
        triggerBotActions(room);
      }
      emitRoom(room.roomCode);
    }
  );

  socket.on(
    "clue:submit",
    ({ roomCode, playerId, text }: { roomCode: string; playerId: string; text: string }, ack?: (resp: any) => void) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.phase !== "submit") return ack?.({ ok: false, error: "Not in submit phase" });

      const cur = room.drawings[room.drawingIndex];
      const submittedText = String(text ?? "").trim();
      if (cur && submittedText.toLowerCase() === cur.prompt.toLowerCase()) {
        return ack?.({ ok: false, error: "That's too close to the real prompt! Try something else." });
      }

      submitClue(room, playerId, submittedText);
      ack?.({ ok: true });

      if (allCluesSubmitted(room)) {
        beginVote(room);
        setupPhaseTimer(room);
        triggerBotActions(room);
      }
      emitRoom(room.roomCode);
    }
  );

  socket.on(
    "vote:cast",
    ({ roomCode, playerId, optionId }: { roomCode: string; playerId: string; optionId: string }, ack?: (resp: any) => void) => {
      const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
      if (!room) return ack?.({ ok: false, error: "Room not found" });
      if (room.phase !== "vote") return ack?.({ ok: false, error: "Not in vote phase" });

      castVote(room, playerId, String(optionId ?? ""));
      ack?.({ ok: true });

      if (allVotesCast(room)) {
        scoreAndReveal(room);
        setupPhaseTimer(room);
        triggerBotActions(room);
      }
      emitRoom(room.roomCode);
    }
  );

  socket.on("reveal:next", ({ roomCode, playerId }: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => {
    const room = getRoom(String(roomCode ?? "").trim().toUpperCase());
    if (!room) return ack?.({ ok: false, error: "Room not found" });
    if (room.hostId !== playerId) return ack?.({ ok: false, error: "Only host can continue" });
    if (room.phase !== "reveal" && room.phase !== "reveal_fake") return ack?.({ ok: false, error: "Not in reveal phase" });

    const prevRound = room.round;
    advance(room);
    setupPhaseTimer(room);
    // If advance triggered a new round, send fresh prompts.
    const phaseNow = (room as unknown as { phase: string }).phase;
    if (phaseNow === "draw" && room.round !== prevRound) {
      emitPrompts(room.roomCode);
    }
    triggerBotActions(room);
    ack?.({ ok: true });
    emitRoom(room.roomCode);
  });

  // --- FAKE ARTIST GOES TO NEW YORK HANDLERS ---
  socket.on("fake:category:submit", ({ roomCode, playerId, category, word }: { roomCode: string, playerId: string, category: string, word: string }, ack?: (resp: any) => void) => {
    const room = getRoom(roomCode);
    if (!room || room.questionMasterId !== playerId || room.phase !== "category") return ack?.({ ok: false });
    room.category = category;
    room.word = word;
    room.phase = "draw_shared";

    // Start drawing rotation: start with the player AFTER the QM
    const qmIndex = room.playerOrder.indexOf(room.questionMasterId!);
    const artistsInOrder: string[] = [];
    for (let i = 1; i <= room.playerOrder.length; i++) {
      const idx = (qmIndex + i) % room.playerOrder.length;
      const pid = room.playerOrder[idx]!;
      if (pid !== room.questionMasterId) {
        artistsInOrder.push(pid);
      }
    }

    room.activePlayerId = artistsInOrder[0];
    room.turnNumber = 1;

    setupPhaseTimer(room);
    emitRoom(roomCode);
    triggerBotActions(room);
    ack?.({ ok: true });
  });

  socket.on("fake:draw:submit", ({ roomCode, playerId, imageDataUrl }: { roomCode: string, playerId: string, imageDataUrl: string }, ack?: (resp: any) => void) => {
    const room = getRoom(roomCode);
    if (!room || room.activePlayerId !== playerId || room.phase !== "draw_shared") return ack?.({ ok: false });

    room.sharedDrawingUrl = imageDataUrl;
    room.turnNumber++;

    const artists = room.playerOrder.filter(id => id !== room.questionMasterId);
    const totalTurnsNeeded = artists.length * 2; // 2 rotations

    if (room.turnNumber > totalTurnsNeeded) {
      room.phase = "accuse";
      room.activePlayerId = undefined;
    } else {
      const currentArtistIndex = artists.indexOf(playerId);
      room.activePlayerId = artists[(currentArtistIndex + 1) % artists.length];
    }

    setupPhaseTimer(room);
    emitRoom(roomCode);
    triggerBotActions(room);
    ack?.({ ok: true });
  });

  socket.on("fake:accuse:vote", ({ roomCode, playerId, targetId }: { roomCode: string, playerId: string, targetId: string }, ack?: (resp: any) => void) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== "accuse" || playerId === room.questionMasterId) return ack?.({ ok: false });

    room.votedForId.set(playerId, targetId);

    const artists = room.playerOrder.filter(id => id !== room.questionMasterId);
    if (room.votedForId.size >= artists.length) {
      // Tally votes
      const votes: Record<string, number> = {};
      room.votedForId.forEach(tid => votes[tid] = (votes[tid] || 0) + 1);

      let maxVotes = 0;
      let caughtId = "";
      for (const [id, count] of Object.entries(votes)) {
        if (count > maxVotes) {
          maxVotes = count;
          caughtId = id;
        }
      }

      room.isFakeArtistCaught = (caughtId === room.fakeArtistId);
      if (room.isFakeArtistCaught) {
        room.phase = "guess";
      } else {
        resolveFakeArtistRound(room, true);
        room.phase = "reveal_fake";
      }
      setupPhaseTimer(room);
    }

    emitRoom(roomCode);
    triggerBotActions(room);
    ack?.({ ok: true });
  });

  socket.on("fake:votes:continue", ({ roomCode, playerId }: { roomCode: string, playerId: string }, ack?: (resp: any) => void) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId || room.phase !== "fake_votes") return ack?.({ ok: false });

    if (room.isFakeArtistCaught) {
      room.phase = "guess";
    } else {
      // Fake artist wins (not caught)
      resolveFakeArtistRound(room, true);
      room.phase = "reveal_fake";
    }

    emitRoom(roomCode);
    triggerBotActions(room);
    ack?.({ ok: true });
  });

  socket.on("fake:guess:submit", ({ roomCode, playerId, guess }: { roomCode: string, playerId: string, guess: string }, ack?: (resp: any) => void) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== "guess" || playerId !== room.fakeArtistId) return ack?.({ ok: false });

    room.fakeArtistGuess = guess;
    const isCorrect = guess.trim().toLowerCase() === room.word?.trim().toLowerCase();
    resolveFakeArtistRound(room, isCorrect);

    room.phase = "reveal_fake";
    emitRoom(room.roomCode);
    triggerBotActions(room);
    ack?.({ ok: true });
  });


  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!roomCode || !playerId) return;
    const room = getRoom(roomCode);
    if (!room) return;
    setConnected(room, playerId, false);
    maybeReassignHost(room);
    emitRoom(room.roomCode);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

