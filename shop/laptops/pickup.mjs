const ZONE = 'America/Denver';
const FIRST_PICKUP = '2026-11-19';
const UNAVAILABLE_PICKUPS = new Set(['2026-11-26']);
const DAY_MS = 86_400_000;

function mountainParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]));
}

function mountainPickupInstant(year, month, day) {
  const requested = Date.UTC(year, month - 1, day, 19);
  let instant = requested;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = mountainParts(new Date(instant));
    const shown = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    instant += requested - shown;
  }
  return instant;
}

export function upcomingPickupSlots(now = new Date(), count = 8) {
  const local = mountainParts(now);
  const start = Date.UTC(local.year, local.month - 1, local.day);
  const slots = [];
  const labelFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  for (let offset = 0; offset < 90 && slots.length < count; offset += 1) {
    const day = new Date(start + offset * DAY_MS);
    if (![2, 4].includes(day.getUTCDay())) continue;
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    if (iso < FIRST_PICKUP || UNAVAILABLE_PICKUPS.has(iso) || mountainPickupInstant(year, month, date) - now.getTime() < DAY_MS) continue;
    slots.push({ value: iso.replaceAll('-', ''), label: `${labelFormat.format(day)} · 7:00 p.m.` });
  }
  return slots;
}

export function pickupCheckoutUrl(baseLink, stockNumber, pickupDate, now = new Date()) {
  if (!Number.isSafeInteger(stockNumber) || !upcomingPickupSlots(now).some(slot => slot.value === pickupDate)) return null;
  const url = new URL(baseLink);
  url.searchParams.set('client_reference_id', `laptop-${stockNumber}-pickup-${pickupDate}`);
  return url.href;
}
