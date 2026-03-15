import { EventCategory, TimeSlot, Vibe } from "@citypulse/types";
import type { ApiEvent } from "./api-types";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.CULTURE]: "Culture",
  [EventCategory.EDUCATION]: "Education",
  [EventCategory.ENTERTAINMENT]: "Entertainment",
  [EventCategory.FOOD]: "Food",
  [EventCategory.NIGHTLIFE]: "Nightlife",
  [EventCategory.SPORTS]: "Sports",
  [EventCategory.WELLNESS]: "Wellness",
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.CULTURE]: "var(--cat-culture)",
  [EventCategory.EDUCATION]: "#38bdf8",
  [EventCategory.ENTERTAINMENT]: "var(--cat-entertainment)",
  [EventCategory.FOOD]: "var(--cat-food)",
  [EventCategory.NIGHTLIFE]: "var(--cat-nightlife)",
  [EventCategory.SPORTS]: "var(--cat-sports)",
  [EventCategory.WELLNESS]: "var(--cat-wellness)",
};

export const getCategoryLabel = (category: EventCategory | null): string =>
  category === null ? "Unclassified" : CATEGORY_LABELS[category];

export const getCategoryColor = (category: EventCategory | null): string =>
  category === null ? "var(--cp-border-muted)" : CATEGORY_COLORS[category];

export const formatEventDateTime = (dateTime: string, timezone?: string): string =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(dateTime));

export const formatEventWindow = (
  startTime: string,
  endTime: string | null,
  timezone?: string
): string => {
  const start = formatEventDateTime(startTime, timezone);

  if (endTime === null) {
    return start;
  }

  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(endTime));

  return `${start} - ${end}`;
};

export const formatRelativeDate = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export const vibeLabel = (value: Vibe): string =>
  ({
    [Vibe.BOTH]: "Flexible",
    [Vibe.CHILL]: "Chill",
    [Vibe.SOCIAL]: "Social",
  })[value];

export const timeSlotLabel = (value: TimeSlot): string =>
  ({
    [TimeSlot.MORNING]: "Morning",
    [TimeSlot.AFTERNOON]: "Afternoon",
    [TimeSlot.EVENING]: "Evening",
    [TimeSlot.LATE_NIGHT]: "Late Night",
  })[value];

export const eventToCardData = (event: ApiEvent) => ({
  id: event.id,
  title: event.title,
  datetime: formatEventDateTime(event.startTime, event.city?.timezone),
  location: event.locationName,
  tags: event.tags.slice(0, 3).map((tag) => tag.name),
  categoryColor: getCategoryColor(event.category),
});
