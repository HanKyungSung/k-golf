export function minutesToRange(open: number, close: number) {
  const fmt = (n: number) => String(Math.floor(n/60)).padStart(2,'0') + ':' + String(n%60).padStart(2,'0');
  return `${fmt(open)}–${fmt(close)}`;
}
