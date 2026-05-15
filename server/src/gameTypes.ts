export type RoomCode = string;
export type PlayerId = string;

export type Phase = "lobby" | "avatar" | "draw" | "submit" | "vote" | "reveal" | "game_over" | "category" | "draw_shared" | "accuse" | "fake_votes" | "guess" | "reveal_fake";

export type Player = {
  id: PlayerId;
  name: string;
  socketId: string;
  score: number;
  connected: boolean;
  color: string;
  avatarUrl?: string;
  isBot?: boolean;
  /** Lobby-only toggle: full view, no prompts / drawing / voting */
  isSpectator?: boolean;
};

export type Drawing = {
  drawerId: PlayerId;
  prompt: string;
  imageDataUrl?: string;
};

export type Option = {
  id: string;
  text: string;
  /** null means the real prompt option */
  authorId: PlayerId | null;
};

export type Reveal = {
  drawingIndex: number;
  drawerId: PlayerId;
  prompt: string;
  imageDataUrl: string;
  options: Array<{
    id: string;
    text: string;
    authorId: PlayerId | null;
    votes: PlayerId[];
  }>;
  pointsDeltaByPlayer: Record<PlayerId, number>;
  totalDrawings: number;
};

export type RoomStatePublic = {
  roomCode: RoomCode;
  hostId: PlayerId;
  phase: Phase;
  gameType: "drawful" | "fake_artist";
  round: number;
  totalRounds: number;
  timerSeconds: number;
  useExtraPrompt: boolean;
  lockColors: boolean;
  revealOrder: "random" | "round_robin";
  fakeArtistHighlight: boolean;
  botCount: number;
  /** Join order (not sorted by name); used for Fake Artist turn strip and Drawful drawing order */
  playerOrder: PlayerId[];
  /** Drawful: drawer ids for the current round, in reveal order */
  drawingPlayerOrder?: PlayerId[];
  players: Array<Pick<Player, "id" | "name" | "score" | "connected" | "color" | "avatarUrl" | "isBot" | "isSpectator">>;
  endTime?: number;
  avatar?: {
    submittedBy: PlayerId[];
  };
  drawing?: {
    submittedBy: PlayerId[];
  };
  submit?: {
    drawerId: PlayerId;
    imageDataUrl: string;
    submittedBy: PlayerId[];
    drawingIndex: number;
    totalDrawings: number;
  };
  vote?: {
    drawerId: PlayerId;
    imageDataUrl: string;
    options: Array<Pick<Option, "id" | "text">>;
    votedBy: PlayerId[];
    drawingIndex: number;
    totalDrawings: number;
  };
  reveal?: Reveal;
  fakeArtist?: {
    questionMasterId: PlayerId;
    fakeArtistId: PlayerId;
    category?: string;
    word?: string;
    activePlayerId?: PlayerId;
    turnNumber: number;
    sharedDrawingUrl?: string;
    /** Present during accuse: one full snapshot per stroke in order (large payload). */
    strokeLog?: Array<{ playerId: PlayerId; snapshotUrl: string }>;
    votedForId?: Record<PlayerId, PlayerId>;
    isFakeArtistCaught?: boolean;
    fakeArtistGuess?: string;
    winner?: "artists" | "fake";
    pointsDeltaByPlayer?: Record<PlayerId, number>;
  };
};

