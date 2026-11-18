/** Helpers for @unovis VisAxis tickFormat under strict TypeScript. */
export function unovisTickFormat(
  format: (value: number) => string,
): (tick: number | Date, _i: number, _ticks: (number | Date)[]) => string {
  return (tick) => (typeof tick === "number" ? format(tick) : "");
}

export function unovisMillionTick(
  tick: number | Date,
  _i: number,
  _ticks: (number | Date)[],
): string {
  return typeof tick === "number" ? (tick / 10 ** 6).toFixed(1) : "";
}

export function unovisPercentTick(
  tick: number | Date,
  _i: number,
  _ticks: (number | Date)[],
): string {
  return typeof tick === "number" ? `${(tick * 100).toFixed(0)}%` : "";
}