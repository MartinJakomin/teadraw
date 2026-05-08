export type PlayerId = string;

export type Phase =
  | "lobby"
  | "avatar"
  | "draw"
  | "submit"
  | "vote"
  | "reveal"
  | "game_over"
  | "category"
  | "draw_shared"
  | "accuse"
  | "fake_votes"
  | "guess"
  | "reveal_fake";

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

export type RoomState = {
  roomCode: string;
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
  endTime?: number;
  players: Array<{ id: PlayerId; name: string; score: number; connected: boolean; color: string; avatarUrl?: string; isBot?: boolean }>;
  avatar?: { submittedBy: PlayerId[] };
  drawing?: { submittedBy: PlayerId[] };
  submit?: { drawerId: PlayerId; imageDataUrl: string; submittedBy: PlayerId[]; drawingIndex: number; totalDrawings: number; };
  vote?: { drawerId: PlayerId; imageDataUrl: string; options: Array<{ id: string; text: string }>; votedBy: PlayerId[]; drawingIndex: number; totalDrawings: number; };
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
    winner?: "fake" | "artists";
    pointsDeltaByPlayer?: Record<string, number>;
  };
};
