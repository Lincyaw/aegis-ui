export type RefreshInterval = 'manual' | 2 | 5 | 10 | 30 | 60;

export function intervalToMs(v: RefreshInterval): number | false {
  return v === 'manual' ? false : v * 1000;
}
