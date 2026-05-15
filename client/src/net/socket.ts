import { io, Socket } from "socket.io-client";
import type { RoomState } from "../types";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export type ClientToServerEvents = {
  "room:create": (payload: { name: string }, ack?: (resp: any) => void) => void;
  "room:join": (payload: { roomCode: string; name: string; playerId?: string }, ack?: (resp: any) => void) => void;
  "room:leave": (payload: { roomCode: string; playerId: string }) => void;
  "game:start": (payload: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => void;
  "draw:submit": (payload: { roomCode: string; playerId: string; imageDataUrl: string }, ack?: (resp: any) => void) => void;
  "clue:submit": (payload: { roomCode: string; playerId: string; text: string }, ack?: (resp: any) => void) => void;
  "vote:cast": (payload: { roomCode: string; playerId: string; optionId: string }, ack?: (resp: any) => void) => void;
  "reveal:next": (payload: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => void;
  "room:updateSettings": (payload: { roomCode: string; playerId: string } & Record<string, any>) => void;
  "avatar:submit": (payload: { roomCode: string; playerId: string; imageDataUrl: string; color: string; }) => void;
  "fake:category:submit": (payload: { roomCode: string; playerId: string; category: string; word: string; }) => void;
  "fake:draw:submit": (payload: { roomCode: string; playerId: string; imageDataUrl: string; }) => void;
  "fake:accuse:vote": (payload: { roomCode: string; playerId: string; targetId: string; }) => void;
  "fake:votes:continue": (payload: { roomCode: string; playerId: string; }) => void;
  "fake:guess:submit": (payload: { roomCode: string; playerId: string; guess: string; }) => void;
  "room:stop": (payload: { roomCode: string; playerId: string; }) => void;
  "room:toggleSpectator": (payload: { roomCode: string; playerId: string }, ack?: (resp: any) => void) => void;
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
