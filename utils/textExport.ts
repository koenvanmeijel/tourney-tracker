import { EVENT_TYPE_LABELS, type EventRecord, type MarkerRecord } from '@/models/types';
import { formatIsoDateForDisplay } from '@/utils/date';
import { formatDeckLabel, formatDeckLabelOrNull, formatPlacementHeadline } from '@/utils/format';
import { opponentPlaceholder, roundHasOpponent, roundResultLabel } from '@/utils/rounds';

function formatEventBlock(event: EventRecord): string {
  const placementHeadline = formatPlacementHeadline(event.placement, event.placementTotal);
  const deckLabel = formatDeckLabel(event.deckName, event.deckPokemon);

  let header = `${formatIsoDateForDisplay(event.date)} ${EVENT_TYPE_LABELS[event.eventType]}`;
  if (event.location) {
    header += ` @ ${event.location}`;
  }
  header += ` - ${deckLabel}`;
  if (placementHeadline) {
    header += ` (${placementHeadline})`;
  }

  const lines = [header];
  for (const round of event.rounds) {
    const label = roundResultLabel(round.result, round.games);
    if (!roundHasOpponent(round.result)) {
      lines.push(label);
      continue;
    }
    const opponent = formatDeckLabelOrNull(round.opponentDeckName, round.opponentDeckPokemon) ?? opponentPlaceholder(round.result);
    lines.push(`${label} - ${opponent}`);
  }
  if (event.notes) {
    lines.push(`Note: ${event.notes}`);
  }

  return lines.join('\n');
}

function formatMarkerBlock(marker: MarkerRecord): string {
  const date = formatIsoDateForDisplay(marker.date);
  const body = marker.note ? `${marker.title}: ${marker.note}` : marker.title;
  return `-- ${body} - ${date} --`;
}

interface FeedItem {
  date: string;
  text: string;
}

/** Builds a human-readable .txt rendering of the events/markers feed, most
 * recent first (same order as the in-app Overview) — not re-importable, just
 * for reading or pasting elsewhere. */
export function buildTextExport(events: EventRecord[], markers: MarkerRecord[]): string {
  const items: FeedItem[] = [
    ...events.map((event) => ({ date: event.date, text: formatEventBlock(event) })),
    ...markers.map((marker) => ({ date: marker.date, text: formatMarkerBlock(marker) })),
  ];
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return items.map((item) => item.text).join('\n\n');
}
