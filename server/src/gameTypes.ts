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
  botCount: number;
  players: Array<Pick<Player, "id" | "name" | "score" | "connected" | "color" | "avatarUrl" | "isBot">>;
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
  };
  vote?: {
    drawerId: PlayerId;
    imageDataUrl: string;
    options: Array<Pick<Option, "id" | "text">>;
    votedBy: PlayerId[];
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
    votedForId?: Record<PlayerId, PlayerId>;
    isFakeArtistCaught?: boolean;
    fakeArtistGuess?: string;
    winner?: "artists" | "fake";
    pointsDeltaByPlayer?: Record<PlayerId, number>;
  };
};

