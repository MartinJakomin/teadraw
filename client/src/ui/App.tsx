import React, { useEffect, useMemo, useRef, useState } from "react";
import type { RoomState } from "../types";
import { getSocket } from "../net/socket";
import { DrawScreen } from "./screens/DrawScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { SubmitScreen } from "./screens/SubmitScreen";
import { VoteScreen } from "./screens/VoteScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { GameOverScreen } from "./screens/GameOverScreen";
import { CategoryScreen } from "./screens/CategoryScreen";
import { SharedDrawScreen } from "./screens/SharedDrawScreen";
import { AccuseScreen } from "./screens/AccuseScreen";
import { VoteResultsScreen } from "./screens/VoteResultsScreen";
import { GuessScreen } from "./screens/GuessScreen";
import { RevealFakeScreen } from "./screens/RevealFakeScreen";
import { TitleScreen } from "./screens/TitleScreen";
import { Sidebar } from "./components/Sidebar";
import { AvatarScreen } from "./screens/AvatarScreen";

const LS = {
  name: "teadraw:name",
  roomCode: "teadraw:roomCode",
  playerId: "teadraw:playerId",
  prompt: "teadraw:prompt"
} as const;

function load(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function LoadingCard({ message }: { message?: string }) {
  return (
    <div className="page scale-in">
      <div className="card">
        <h2>{message ?? "Loading…"}</h2>
        <div className="muted">Sit tight, we're getting things ready!</div>
      </div>
    </div>
  );
}

export function App() {
  const socket = useMemo(() => getSocket(), []);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [name, setName] = useState(() => load(LS.name));
  const [roomCode, setRoomCode] = useState(() => load(LS.roomCode));
  const [playerId, setPlayerId] = useState(() => load(LS.playerId));
  const [prompt, setPrompt] = useState(() => load(LS.prompt));
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const onState = (s: RoomState) => setRoom(s);
    const onPrompt = ({ prompt: p }: { prompt: string }) => {
      setPrompt(p);
      save(LS.prompt, p);
    };

    socket.on("room:state", onState);
    socket.on("prompt:you", onPrompt);
    return () => {
      socket.off("room:state", onState);
      socket.off("prompt:you", onPrompt);
    };
  }, [socket]);

  useEffect(() => {
    save(LS.name, name);
  }, [name]);
  useEffect(() => {
    save(LS.roomCode, roomCode);
  }, [roomCode]);
  useEffect(() => {
    save(LS.playerId, playerId);
  }, [playerId]);

  const [flashKey, setFlashKey] = useState(0);
  const [showTitle, setShowTitle] = useState(true);
  const lastPhase = useRef<string | null>(null);

  useEffect(() => {
    if (room?.phase && room.phase !== lastPhase.current) {
      setFlashKey((k) => k + 1);
      lastPhase.current = room.phase;
    }
  }, [room?.phase]);

  const me = room?.players.find((p) => p.id === playerId) ?? null;
  const isHost = room?.hostId === playerId;

  const leave = () => {
    if (roomCode && playerId) socket.emit("room:leave", { roomCode, playerId });
    setRoom(null);
    setError("");
    lastPhase.current = null;
  };

  if (showTitle) {
    return <TitleScreen onContinue={() => setShowTitle(false)} />;
  }

  if (!room) {
    return (
      <HomeScreen
        name={name}
        setName={setName}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        error={error}
        onCreate={() => {
          setError("");
          socket.emit("room:create", { name }, (resp: any) => {
            if (!resp?.ok) return setError(resp?.error ?? "Failed to create room");
            setRoomCode(resp.roomCode);
            setPlayerId(resp.playerId);
          });
        }}
        onJoin={() => {
          setError("");
          socket.emit("room:join", { roomCode, name, playerId: playerId || undefined }, (resp: any) => {
            if (!resp?.ok) return setError(resp?.error ?? "Failed to join room");
            setRoomCode(resp.roomCode);
            setPlayerId(resp.playerId);
          });
        }}
      />
    );
  }

  const renderScreen = () => {
    if (!me) {
      return (
        <div className="page scale-in">
          <div className="card">
            <h2>Reconnecting…</h2>
            <p>If this takes long, leave and rejoin the room.</p>
            <button className="btn" onClick={leave}>
              Leave
            </button>
          </div>
        </div>
      );
    }

    switch (room.phase) {
      case "lobby":
        return (
          <LobbyScreen
            room={room}
            me={me}
            isHost={isHost}
            onStart={() => socket.emit("game:start", { roomCode: room.roomCode, playerId })}
            onUpdateSettings={(settings) => socket.emit("room:updateSettings", { roomCode: room.roomCode, playerId, ...settings })}
            onLeave={leave}
          />
        );

      case "avatar":
        return (
          <AvatarScreen
            room={room}
            me={me}
            onAvatarSubmit={(dataUrl, color) => {
              socket.emit("avatar:submit", { roomCode: room.roomCode, playerId, imageDataUrl: dataUrl, color });
            }}
          />
        );

      case "draw":
        return (
          <DrawScreen
            room={room}
            me={me}
            prompt={prompt}
            onSubmit={(imageDataUrl) => socket.emit("draw:submit", { roomCode: room.roomCode, playerId, imageDataUrl })}
          />
        );

      case "submit":
        if (!room.submit) return <LoadingCard message="Preparing fake prompts…" />;
        return (
          <SubmitScreen
            room={room}
            me={me}
            submit={room.submit}
            onSubmit={(text, onDone) => {
              socket.emit("clue:submit", { roomCode: room.roomCode, playerId, text }, (resp: any) => {
                if (!resp?.ok) onDone?.(resp?.error ?? "Error submitting clue");
                else {
                  save("teadraw:myClue", text);
                  onDone?.();
                }
              });
            }}
          />
        );

      case "vote":
        if (!room.vote) return <LoadingCard message="Preparing voting options…" />;
        return (
          <VoteScreen
            room={room}
            me={me}
            vote={room.vote}
            onVote={(optionId) => socket.emit("vote:cast", { roomCode: room.roomCode, playerId, optionId })}
          />
        );

      case "reveal":
        if (!room.reveal) return <LoadingCard message="Getting the results…" />;
        return (
          <RevealScreen
            room={room}
            me={me}
            reveal={room.reveal}
            isHost={isHost}
            onNext={() => socket.emit("reveal:next", { roomCode: room.roomCode, playerId })}
          />
        );

      case "game_over":
        return <GameOverScreen room={room} isHost={isHost} onRestart={() => socket.emit("game:start", { roomCode: room.roomCode, playerId })} onLeave={leave} />;

      case "category":
        if (!room.fakeArtist) return <LoadingCard message="Preparing category…" />;
        return (
          <CategoryScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            onSubmit={(category, word) => socket.emit("fake:category:submit", { roomCode: room.roomCode, playerId, category, word })}
          />
        );

      case "draw_shared":
        if (!room.fakeArtist) return <LoadingCard message="Preparing canvas…" />;
        return (
          <SharedDrawScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            onSubmit={(url) => socket.emit("fake:draw:submit", { roomCode: room.roomCode, playerId, imageDataUrl: url })}
          />
        );

      case "accuse":
        if (!room.fakeArtist) return <LoadingCard message="Preparing accusation…" />;
        return (
          <AccuseScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            onVote={(targetId) => socket.emit("fake:accuse:vote", { roomCode: room.roomCode, playerId, targetId })}
          />
        );

      case "fake_votes":
        if (!room.fakeArtist) return <LoadingCard message="Preparing results…" />;
        return (
          <VoteResultsScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            isHost={isHost}
            onContinue={() => socket.emit("fake:votes:continue", { roomCode: room.roomCode, playerId })}
          />
        );

      case "guess":
        if (!room.fakeArtist) return <LoadingCard message="Preparing guess…" />;
        return (
          <GuessScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            onSubmit={(guess) => socket.emit("fake:guess:submit", { roomCode: room.roomCode, playerId, guess })}
          />
        );

      case "reveal_fake":
        if (!room.fakeArtist) return <LoadingCard message="Preparing reveal…" />;
        return (
          <RevealFakeScreen
            room={room}
            me={me}
            fake={room.fakeArtist}
            isHost={isHost}
            onNext={() => socket.emit("reveal:next", { roomCode: room.roomCode, playerId })}
          />
        );

      default:
        return <LoadingCard />;
    }
  };

  const key = room ? `${room.phase}-${room.reveal?.drawingIndex ?? 0}` : "home";

  return (
    <div className="layout-split">
      <div className="layout-main">
        {renderScreen()}
      </div>
      {me && room && (
        <Sidebar
          room={room}
          meId={me.id}
          onStop={() => socket.emit("room:stop", { roomCode: room.roomCode, playerId: me.id })}
          onLeave={leave}
        />
      )}
    </div>
  );
}
