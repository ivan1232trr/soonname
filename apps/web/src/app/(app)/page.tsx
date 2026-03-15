"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EventCategory } from "@citypulse/types";
import EventCard from "@/components/EventCard";
import MobileLazyEventCard from "@/components/MobileLazyEventCard";
import { IconNavigation, IconSearch } from "@/components/icons";
import { ApiError, getCities, getEvents } from "@/lib/api";
import type { ApiCity, ApiEvent } from "@/lib/api-types";
import { eventToCardData, getCategoryLabel } from "@/lib/event-presentation";
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

const INITIAL_MOBILE_CARD_COUNT = 4;

export default function FeedPage() {
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | undefined>();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 899px)");
    const syncViewportMode = () => setIsMobileViewport(mediaQuery.matches);
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    syncViewportMode();

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", syncViewportMode);
      return () => mediaQuery.removeEventListener("change", syncViewportMode);
    }

    legacyMediaQuery.addListener?.(syncViewportMode);
    return () => legacyMediaQuery.removeListener?.(syncViewportMode);
  }, []);

  useEffect(() => {
    if (selectedCityId === "") {
      return;
    }

    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getEvents({
          cityId: selectedCityId,
          category: selectedCategory,
          ...(coords !== null ? coords : {}),
        });
        setEvents(response);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, [coords, selectedCategory, selectedCityId]);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? null,
    [cities, selectedCityId]
  );
  const cardEvents = useMemo(() => events.map(eventToCardData), [events]);

  return (
    <div className={`${styles.page} desktopWideLayout`}>
      <div className={styles.topBar}>
        <div>
          <p className={styles.eyebrow}>Live feed</p>
          <span className={styles.wordmark}>Event GO</span>
        </div>
        <Link href="/search" className={styles.iconButton}>
          <IconSearch size={22} color="var(--cp-text-secondary)" />
        </Link>
      </div>

      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.heroLabel}>Browsing city</p>
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
          </div>

          <div className={styles.geoChip}>
            <IconNavigation size={14} color="var(--cp-primary)" />
            <span>{coords === null ? "City ranking" : "Near you"}</span>
          </div>
        </div>

        <p className={styles.heroCopy}>
          {selectedCity === null
            ? "Loading event regions..."
            : `Active events flowing in from ${selectedCity.name}. Rankings use your current location when available and fall back to date order otherwise.`}
        </p>
      </div>

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

      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionTitle}>
            {selectedCategory === undefined ? "All active events" : getCategoryLabel(selectedCategory)}
          </p>
          <p className={styles.sectionMeta}>
            {loading ? "Refreshing…" : `${events.length} event${events.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className={styles.feedList}>
        {error !== null ? <p className={styles.emptyState}>{error}</p> : null}
        {error === null && loading ? <p className={styles.emptyState}>Loading the live feed…</p> : null}
        {error === null && !loading && events.length === 0 ? (
          <p className={styles.emptyState}>No active events matched this filter in the selected city.</p>
        ) : null}
        {cardEvents.map((event, index) => (
          <div key={event.id} className={styles.feedItem}>
            {isMobileViewport ? (
              <MobileLazyEventCard
                event={event}
                eager={index < INITIAL_MOBILE_CARD_COUNT}
              />
            ) : (
              <EventCard event={event} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
