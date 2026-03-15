"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { IconMapPin, IconSearch, IconX } from "@/components/icons";
import { ApiError, getCities, getEvents } from "@/lib/api";
import type { ApiCity, ApiEvent } from "@/lib/api-types";
import { formatEventDateTime } from "@/lib/event-presentation";
import styles from "./page.module.css";

export default function SearchPage() {
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [results, setResults] = useState<ApiEvent[]>([]);
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
  }, []);

  useEffect(() => {
    if (selectedCityId === "") {
      return;
    }

    const loadResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getEvents({
          cityId: selectedCityId,
          q: deferredQuery === "" ? undefined : deferredQuery,
        });
        setResults(response);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Search failed");
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, [deferredQuery, selectedCityId]);

  return (
    <div className="shell">
      <div className={styles.header}>
        <div className={styles.searchBar}>
          <IconSearch size={18} color="var(--cp-text-muted)" />
          <input
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, location, description, or tags..."
            autoFocus
          />
          {query !== "" ? (
            <button className={styles.clearBtn} onClick={() => setQuery("")}>
              <IconX size={16} color="var(--cp-text-muted)" />
            </button>
          ) : null}
        </div>

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

      <p className={styles.resultCount}>
        {loading
          ? "Searching…"
          : `${results.length} result${results.length === 1 ? "" : "s"}${deferredQuery === "" ? " in this city" : ` for "${deferredQuery}"`}`}
      </p>

      <div className={styles.results}>
        {error !== null ? <p className={styles.emptyState}>{error}</p> : null}
        {error === null && !loading && results.length === 0 ? (
          <p className={styles.emptyState}>No events matched your search in the selected city.</p>
        ) : null}

        {results.map((event) => (
          <Link key={event.id} href={`/event/${event.id}`} className={styles.resultCard}>
            <p className={styles.resultTitle}>{event.title}</p>
            <p className={styles.resultDatetime}>
              {formatEventDateTime(event.startTime, event.city?.timezone)}
            </p>
            <div className={styles.resultLoc}>
              <IconMapPin size={13} color="var(--cp-text-tertiary)" />
              <span>{event.locationName}</span>
            </div>
            <div className={styles.resultTags}>
              {event.tags.slice(0, 4).map((tag) => (
                <span key={tag.id} className={styles.resultTag}>
                  #{tag.name}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
