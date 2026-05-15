import type { PlayerId, RoomState } from "../types";

/** Same order as server `getFakeArtistArtistOrder`: after QM in join order, excluding QM and spectators. */
export function fakeArtistArtistIds(room: RoomState, questionMasterId: PlayerId): PlayerId[] {
  const order = room.playerOrder ?? [];
  const qmIndex = order.indexOf(questionMasterId);
  if (qmIndex < 0) return [];
  const out: PlayerId[] = [];
  for (let i = 1; i <= order.length; i++) {
    const idx = (qmIndex + i) % order.length;
    const pid = order[idx]!;
    if (pid === questionMasterId) continue;
    const p = room.players.find((x) => x.id === pid);
    if (p && !p.isSpectator) out.push(pid);
  }
  return out;
}
