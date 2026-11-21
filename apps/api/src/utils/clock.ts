export interface Clock {
  now(): Date;
}

const systemClock: Clock = { now: () => new Date() };
let active: Clock = systemClock;

/** Injectable clock: business code calls clock.now(); tests freeze or advance it. */
export const clock = { now: (): Date => active.now() };

export function setClock(c: Clock): void {
  active = c;
}

export function freezeClock(at: Date | string): void {
  const fixed = new Date(at);
  active = { now: () => new Date(fixed.getTime()) };
}

export function resetClock(): void {
  active = systemClock;
}
