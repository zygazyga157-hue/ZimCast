/**
 * Match lifecycle phases and pass window computation.
 *
 * Buffers:
 *   - Pregame: 15 minutes before kickoff
 *   - Postgame: 60 minutes after match end
 *
 * Default match duration (fallback): 150 minutes (2h30m)
 */

export type MatchPhase = "UPCOMING" | "PREGAME" | "LIVE" | "POSTGAME" | "ENDED";

export type PassState =
  | "NOT_OWNED"
  | "OWNED_UPCOMING"
  | "OWNED_ACTIVE"
  | "OWNED_EXPIRED";

export interface PassWindow {
  passStart: Date;
  passEnd: Date;
  matchEnd: Date;
  phase: MatchPhase;
  phaseEndsAt: Date;
}

const PREGAME_BUFFER_MS = 15 * 60 * 1000;
const POSTGAME_BUFFER_MS = 60 * 60 * 1000;
const DEFAULT_MATCH_DURATION_MS = 150 * 60 * 1000;

export function computePassWindow(
  kickoff: Date,
  programEndTime?: Date | null
): PassWindow {
  const passStart = new Date(kickoff.getTime() - PREGAME_BUFFER_MS);

  const matchEnd = programEndTime
    ? new Date(programEndTime.getTime() - POSTGAME_BUFFER_MS)
    : new Date(kickoff.getTime() + DEFAULT_MATCH_DURATION_MS);

  const passEnd = programEndTime
    ? new Date(programEndTime.getTime())
    : new Date(matchEnd.getTime() + POSTGAME_BUFFER_MS);

  const now = Date.now();
  let phase: MatchPhase;
  let phaseEndsAt: Date;

  if (now < passStart.getTime()) {
    phase = "UPCOMING";
    phaseEndsAt = passStart;
  } else if (now < kickoff.getTime()) {
    phase = "PREGAME";
    phaseEndsAt = kickoff;
  } else if (now < matchEnd.getTime()) {
    phase = "LIVE";
    phaseEndsAt = matchEnd;
  } else if (now < passEnd.getTime()) {
    phase = "POSTGAME";
    phaseEndsAt = passEnd;
  } else {
    phase = "ENDED";
    phaseEndsAt = passEnd;
  }

  return { passStart, passEnd, matchEnd, phase, phaseEndsAt };
}

export function getPassState(
  hasPass: boolean,
  passStart: Date,
  passEnd: Date
): PassState {
  if (!hasPass) return "NOT_OWNED";
  const now = Date.now();
  if (now < passStart.getTime()) return "OWNED_UPCOMING";
  if (now < passEnd.getTime()) return "OWNED_ACTIVE";
  return "OWNED_EXPIRED";
}
