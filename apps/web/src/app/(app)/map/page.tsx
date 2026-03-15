"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EventCategory } from "@citypulse/types";
import GoogleMap, { type ViewportBounds } from "@/components/GoogleMap";
import { IconSearch } from "@/components/icons";
import { ApiError, getCities, getEvents } from "@/lib/api";
import type { ApiCity, ApiEvent } from "@/lib/api-types";
import { formatEventDateTime, getCategoryColor, getCategoryLabel } from "@/lib/event-presentation";
import styles from "./page.module.css";

const CATEGORY_FILTERS: Array<{ label: string; value?: EventCategory }> = [
  { label: "All" },
  { label: "Entertainment", value: EventCategory.ENTERTAINMENT },
  { label: "Food", value: EventCategory.FOOD },
  { label: "Nightlife", value: EventCategory.NIGHTLIFE },
  { label: "Wellness", value: EventCategory.WELLNESS },
  { label: "Culture", value: EventCategory.CULTURE },
  { label: "Sports", value: EventCategory.SPORTS },
  { label: "Education", value: EventCategory.EDUCATION },
];

const VIEWPORT_DEBOUNCE_MS = 300;

export default function MapPage() {
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | undefined>();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportBounds | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportCallbackRef = useRef<((bounds: ViewportBounds) => void) | null>(null);
  const lastViewportRef = useRef<ViewportBounds | null>(null);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await getCities();
        setCities(response);
        if (response[0] !== undefined) {
          setSelectedCityId(response[0].id);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to load cities");
      }
    };

    void loadCities();
  }, []);

  // Fetch events when viewport, city, or category changes
  useEffect(() => {
    if (selectedCityId === "" || viewport === null) {
      return;
    }

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getEvents({
          cityId: selectedCityId,
          category: selectedCategory,
          north: viewport.north,
          south: viewport.south,
          east: viewport.east,
          west: viewport.west,
          zoom: viewport.zoom,
        });
        setEvents(response);
        setSelectedEventId((current) => {
          // Keep current selection if it's still in the new results
          if (current !== null && response.some((e) => e.id === current)) {
            return current;
          }
          return response[0]?.id ?? null;
        });
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Failed to load map events");
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, [selectedCategory, selectedCityId, viewport]);

  // Debounced viewport change handler — stored in a ref so GoogleMap doesn't re-render
  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    const last = lastViewportRef.current;
    if (
      last !== null &&
      Math.abs(last.north - bounds.north) < 0.00001 &&
      Math.abs(last.south - bounds.south) < 0.00001 &&
      Math.abs(last.east - bounds.east) < 0.00001 &&
      Math.abs(last.west - bounds.west) < 0.00001 &&
      last.zoom === bounds.zoom
    ) {
      return;
    }
    lastViewportRef.current = bounds;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setViewport(bounds);
    }, VIEWPORT_DEBOUNCE_MS);
  }, []);

  // Stable callback ref for the GoogleMap component
  useEffect(() => {
    viewportCallbackRef.current = handleViewportChange;
  }, [handleViewportChange]);

  const markers = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        latitude: event.latitude,
        longitude: event.longitude,
      })),
    [events]
  );

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? null,
    [cities, selectedCityId]
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId]
  );

  return (
    <div className={`${styles.page} desktopWideLayout`}>
      <div className={styles.pageHeader}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Spatial discovery</p>
            <span className={styles.wordmark}>Event GO Map</span>
          </div>
          <Link href="/search" className={styles.iconButton}>
            <IconSearch size={22} color="var(--cp-text-secondary)" />
          </Link>
        </div>

        <div className={styles.controls}>
          <select
            className={styles.citySelect}
            value={selectedCityId}
            onChange={(event) => setSelectedCityId(event.target.value)}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.country}
              </option>
            ))}
          </select>

          <div className={styles.filterRow}>
            {CATEGORY_FILTERS.map((filter) => {
              const active = selectedCategory === filter.value;
              return (
                <button
                  key={filter.label}
                  className={`${styles.filterChip} ${active ? styles.filterActive : ""}`}
                  onClick={() => setSelectedCategory(filter.value)}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mapArea}>
          <GoogleMap
            markers={markers}
            center={
              selectedCity === null
                ? undefined
                : { latitude: selectedCity.latitude, longitude: selectedCity.longitude }
            }
            selectedMarkerId={selectedEvent?.id}
            onMarkerSelect={setSelectedEventId}
            onViewportChange={handleViewportChange}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelTitle}>
                {selectedCity === null ? "Loading city" : `${selectedCity.name} hotspots`}
              </p>
              <p className={styles.panelMeta}>
                {loading ? "Refreshing map…" : `${events.length} active event${events.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {selectedEvent !== null ? (
              <span className={styles.categoryChip} style={{ background: getCategoryColor(selectedEvent.category) }}>
                {getCategoryLabel(selectedEvent.category)}
              </span>
            ) : null}
          </div>

          {error !== null ? <p className={styles.emptyState}>{error}</p> : null}
          {error === null && !loading && selectedEvent === null ? (
            <p className={styles.emptyState}>No active events are currently mapped for this filter.</p>
          ) : null}

          {selectedEvent !== null ? (
            <div className={styles.previewCard}>
              <div
                className={styles.previewBar}
                style={{ background: getCategoryColor(selectedEvent.category) }}
              />
              <div className={styles.previewBody}>
                <p className={styles.previewTitle}>{selectedEvent.title}</p>
                <p className={styles.previewMeta}>
                  {formatEventDateTime(selectedEvent.startTime, selectedEvent.city?.timezone)}
                </p>
                <p className={styles.previewLoc}>{selectedEvent.locationName}</p>
              </div>
              <Link href={`/event/${selectedEvent.id}`} className={styles.viewDetailsBtn}>
                View Details
              </Link>
            </div>
          ) : null}

          <div className={styles.eventRail}>
            {events.map((event) => (
              <button
                key={event.id}
                className={`${styles.eventCard} ${selectedEvent?.id === event.id ? styles.eventCardActive : ""}`}
                onClick={() => setSelectedEventId(event.id)}
              >
                <span className={styles.eventCardTitle}>{event.title}</span>
                <span className={styles.eventCardMeta}>
                  {formatEventDateTime(event.startTime, event.city?.timezone)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
