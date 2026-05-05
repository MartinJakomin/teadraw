import { io, Socket } from "socket.io-client";
import type { RoomState } from "../types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

export type ClientToServerEvents = {
  "room:create": (payload: { name: string }, ack?: (resp: any) => void) => void;
  "room:join": (payload: { roomCode: string; name: string; playerId?: string }, ack?: (resp: any) => void) => void;
  "room:leave": (payload: { roomCode: string; playerId: string }) => void;
  "game:start": (payload: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => void;
  "draw:submit": (payload: { roomCode: string; playerId: string; imageDataUrl: string }, ack?: (resp: any) => void) => void;
  "clue:submit": (payload: { roomCode: string; playerId: string; text: string }, ack?: (resp: any) => void) => void;
  "vote:cast": (payload: { roomCode: string; playerId: string; optionId: string }, ack?: (resp: any) => void) => void;
  "reveal:next": (payload: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => void;
};

export type ServerToClientEvents = {
  "room:state": (state: RoomState) => void;
  "prompt:you": (payload: { prompt: string }) => void;
};

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, { transports: ["websocket"] });
  }
  return socket;
}

