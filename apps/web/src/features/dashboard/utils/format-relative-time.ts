const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });

const UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
];

// "há 2 dias", "há 3 horas", "há 5 minutos"; under one minute counts as "agora há pouco"
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(isoDate).getTime()) / 1000));
  for (const { unit, seconds } of UNITS) {
    if (elapsed >= seconds) return formatter.format(-Math.floor(elapsed / seconds), unit);
  }
  return 'agora há pouco';
}
