"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventStatus } from "@citypulse/types";
import BottomNav from "@/components/BottomNav";
import { IconChevronLeft, IconSparkles } from "@/components/icons";
import { ApiError, getMyEvents } from "@/lib/api";
import type { ApiEvent } from "@/lib/api-types";
import { getStoredToken } from "@/lib/auth-storage";
import {
  formatEventDateTime,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/event-presentation";
import styles from "./page.module.css";

function statusLabel(status: string) {
  switch (status) {
    case EventStatus.ACTIVE:
      return { text: "Live", className: styles.labelActive, dotClass: styles.statusActive };
    case EventStatus.PENDING_CLASSIFICATION:
      return { text: "AI Classifying...", className: styles.labelPending, dotClass: styles.statusPending };
    case EventStatus.FLAGGED:
      return { text: "Flagged", className: styles.labelFlagged, dotClass: styles.statusFlagged };
    default:
      return { text: status, className: styles.labelPending, dotClass: styles.statusPending };
  }
}

export default function MyEventsPage() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    const token = getStoredToken();
    if (token === null) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getMyEvents(token);
      setEvents(response);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to load your events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  // Auto-refresh pending events every 5 seconds
  useEffect(() => {
    const hasPending = events.some(
      (e) => e.status === EventStatus.PENDING_CLASSIFICATION
    );
    if (!hasPending) {
      return;
    }

    const interval = setInterval(() => {
      void fetchEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, [events]);

  const token = typeof window !== "undefined" ? getStoredToken() : null;

  return (
    <div className="shell">
      <div className={styles.navHeader}>
        <Link href="/post" className={styles.backBtn}>
          <IconChevronLeft size={20} color="var(--cp-text-secondary)" />
          <span>Post</span>
        </Link>
        <span className={styles.headerTitle}>My Events</span>
        <div className={styles.spacer50} />
      </div>

      {token === null ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Sign in to see your events</p>
          <p className={styles.emptyBody}>
            Go to your profile to sign in first.
          </p>
          <Link href="/profile" className={styles.postLink}>
            Go to Profile
          </Link>
        </div>
      ) : loading ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyBody}>Loading your events...</p>
        </div>
      ) : error !== null ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyBody}>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No events yet</p>
          <p className={styles.emptyBody}>
            Events you post will appear here with their AI classification
            status.
          </p>
          <Link href="/post" className={styles.postLink}>
            Post Your First Event
          </Link>
        </div>
      ) : (
        <div className={styles.content}>
          {events.map((event) => {
            const status = statusLabel(event.status);
            return (
              <Link
                key={event.id}
                href={`/event/${event.id}`}
                className={styles.eventItem}
              >
                <div className={`${styles.statusDot} ${status.dotClass}`} />
                <div className={styles.eventInfo}>
                  <p className={styles.eventTitle}>{event.title}</p>
                  <p className={styles.eventMeta}>
                    {formatEventDateTime(
                      event.startTime,
                      event.city?.timezone
                    )}{" "}
                    &middot; {event.locationName}
                  </p>
                  <p className={`${styles.eventStatusLabel} ${status.className}`}>
                    {event.status === EventStatus.PENDING_CLASSIFICATION ? (
                      <IconSparkles size={12} color="#eab308" />
                    ) : null}
                    {status.text}
                  </p>
                  {event.tags.length > 0 ? (
                    <div className={styles.eventTags}>
                      {event.tags.slice(0, 4).map((tag) => (
                        <span key={tag.id} className={styles.tag}>
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {event.category !== null ? (
                  <span
                    className={styles.categoryChip}
                    style={{ background: getCategoryColor(event.category) }}
                  >
                    {getCategoryLabel(event.category)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
