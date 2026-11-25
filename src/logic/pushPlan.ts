// A lejárati értesítések időpontjai (tiszta függvény, a natív és a webes ütemezés is ezt használja)
export function expiryPlan(endAt: number, soon: string, expired: string, title: string, soonMin: number, now = Date.now(), minAheadMs = 5000) {
  return (
    [
      [endAt - soonMin * 60000, soon],
      [endAt, expired],
    ] as [number, string][]
  )
    .filter(([at]) => at > now + minAheadMs)
    .map(([at, body]) => ({ at, title, body }));
}
