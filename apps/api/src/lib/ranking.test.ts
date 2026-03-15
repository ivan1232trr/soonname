import assert from "node:assert/strict";
import test from "node:test";
import { getH3Indexes } from "./h3.js";
import { rankEvents } from "./ranking.js";

type RankedEvent = Parameters<typeof rankEvents>[0][number];

const makeEvent = (
  id: string,
  eventDate: string,
  startTime: string,
  lat: number,
  lng: number
): RankedEvent => {
  const indexes = getH3Indexes(lat, lng);

  return {
    id,
    title: `Event ${id}`,
    description: `Description for ${id}`,
    locationName: `Location ${id}`,
    latitude: lat,
    longitude: lng,
    h3R6: indexes.r6,
    h3R7: indexes.r7,
    h3R8: indexes.r8,
    h3R9: indexes.r9,
    h3R11: indexes.r11,
    category: null,
    eventDate: new Date(eventDate),
    startTime: new Date(startTime),
    endTime: null,
    status: "ACTIVE",
    cityId: "kingston",
    submittedById: "user-1",
    createdAt: new Date("2026-03-14T12:00:00.000Z"),
    updatedAt: new Date("2026-03-14T12:00:00.000Z"),
  };
};

test("rankEvents sorts chronologically when no user location is provided", () => {
  const laterEvent = makeEvent(
    "later",
    "2026-03-22T00:00:00.000Z",
    "2026-03-22T19:00:00.000Z",
    18.0179,
    -76.8099
  );
  const soonerEvent = makeEvent(
    "sooner",
    "2026-03-18T00:00:00.000Z",
    "2026-03-18T19:00:00.000Z",
    18.0305,
    -76.7914
  );

  const ranked = rankEvents([laterEvent, soonerEvent]);

  assert.deepEqual(
    ranked.map((event) => event.id),
    ["sooner", "later"]
  );
});

test("rankEvents prioritizes nearer events when a user location is provided", () => {
  const userIndexes = getH3Indexes(18.0179, -76.8099);
  const nearbyEvent = makeEvent(
    "nearby",
    "2026-03-22T00:00:00.000Z",
    "2026-03-22T19:00:00.000Z",
    18.0179,
    -76.8099
  );
  const fartherEvent = makeEvent(
    "farther",
    "2026-03-18T00:00:00.000Z",
    "2026-03-18T19:00:00.000Z",
    18.109,
    -77.2975
  );

  const ranked = rankEvents([fartherEvent, nearbyEvent], userIndexes.r9);

  assert.deepEqual(
    ranked.map((event) => event.id),
    ["nearby", "farther"]
  );
});
