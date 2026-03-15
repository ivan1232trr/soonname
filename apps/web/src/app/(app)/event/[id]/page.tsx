"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { UserInteractionType } from "@citypulse/types";
import GoogleMap from "@/components/GoogleMap";
import {
  IconChevronLeft,
  IconHeart,
  IconMapPin,
  IconCalendar,
  IconShare,
  IconSparkles,
} from "@/components/icons";
import { EventStatus } from "@citypulse/types";
import { ApiError, getEvent, recordInteraction } from "@/lib/api";
import type { ApiEvent } from "@/lib/api-types";
import { getStoredToken } from "@/lib/auth-storage";
import {
  formatEventWindow,
  formatRelativeDate,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/event-presentation";
import styles from "./page.module.css";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("Interested");

  useEffect(() => {
    if (eventId === undefined) {
      return;
    }

    const loadEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getEvent(eventId);
        setEvent(response);

        const token = getStoredToken();
        if (token !== null) {
          void recordInteraction(token, response.id, UserInteractionType.VIEW).catch(() => undefined);
        }
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    void loadEvent();
  }, [eventId]);

  // Auto-refresh pending events to detect when classification completes
  useEffect(() => {
    if (event === null || event.status !== EventStatus.PENDING_CLASSIFICATION) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getEvent(event.id);
        setEvent(updated);
      } catch {
        // Ignore refresh errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [event]);

  const mapCenter = useMemo(
    () =>
      event === null
        ? undefined
        : { latitude: event.latitude, longitude: event.longitude },
    [event]
  );

  const handleSave = async () => {
    if (event === null) {
      return;
    }

    const token = getStoredToken();
    if (token === null) {
      setError("Sign in on the profile page to save or share event interactions.");
      return;
    }

    try {
      const response = await recordInteraction(token, event.id, UserInteractionType.SAVE);
      setSaveLabel("status" in response ? "Interest removed" : "Saved");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to save event");
    }
  };

  const handleShare = async () => {
    if (event === null) {
      return;
    }

    const shareUrl = window.location.href;

    if (navigator.share !== undefined) {
      await navigator.share({
        title: event.title,
        text: event.description,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setSaveLabel("Link copied");
  };

  return (
    <>
      <div className={styles.navHeader}>
        <Link href="/" className={styles.backBtn}>
          <IconChevronLeft size={24} color="var(--cp-text-primary)" />
          <span>Back</span>
        </Link>
        <button className={styles.iconButton} onClick={() => void handleShare()}>
          <IconShare size={22} color="var(--cp-text-secondary)" />
        </button>
      </div>

      <div
        className={styles.categoryBar}
        style={{ background: getCategoryColor(event?.category ?? null) }}
      />

      <div className={styles.scrollContent}>
        {loading ? <p className={styles.body}>Loading event details…</p> : null}
        {error !== null ? <p className={styles.body}>{error}</p> : null}

        {event !== null ? (
          <>
            {event.status === EventStatus.PENDING_CLASSIFICATION ? (
              <div className={styles.pendingBanner}>
                <div className={styles.pendingIcon}>
                  <IconSparkles size={22} color="#cc33ff" />
                </div>
                <div className={styles.pendingText}>
                  <p className={styles.pendingTitle}>AI is classifying this event</p>
                  <p className={styles.pendingBody}>
                    Category and tags will be assigned automatically. This event will appear
                    in the public feed once classification is complete.
                  </p>
                </div>
              </div>
            ) : null}

            <div className={styles.titleBlock}>
              <span
                className={styles.categoryTag}
                style={{ background: getCategoryColor(event.category) }}
              >
                {getCategoryLabel(event.category)}
              </span>
              <h1 className={styles.title}>{event.title}</h1>
            </div>

            <div className={styles.meta}>
              <div className={styles.metaRow}>
                <IconCalendar size={18} color="#650386" />
                <span>{formatEventWindow(event.startTime, event.endTime, event.city?.timezone)}</span>
              </div>
              <div className={styles.metaRow}>
                <IconMapPin size={18} color="#650386" />
                <span>{event.locationName}</span>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.body}>{event.description}</p>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Tags</h2>
              <div className={styles.tagsRow}>
                {event.tags.map((tag, index) => (
                  <span key={tag.id} className={index === 0 ? styles.tagPrimary : styles.tagMuted}>
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Location</h2>
              <GoogleMap
                markers={[
                  {
                    id: event.id,
                    title: event.title,
                    latitude: event.latitude,
                    longitude: event.longitude,
                  },
                ]}
                center={mapCenter}
                selectedMarkerId={event.id}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Spatial indexes</h2>
              <div className={styles.tagsRow}>
                <span className={styles.tagMuted}>H3 r7: {event.h3R7}</span>
                <span className={styles.tagMuted}>H3 r9: {event.h3R9}</span>
                <span className={styles.tagMuted}>H3 r11: {event.h3R11}</span>
              </div>
            </div>

            <p className={styles.postedBy}>
              Posted by {event.submittedBy?.name ?? "CityPulse"} · indexed {formatRelativeDate(event.updatedAt)}
            </p>
          </>
        ) : null}
      </div>

      <div className={styles.stickyFooter}>
        <button className={styles.interestedBtn} onClick={() => void handleSave()}>
          <IconHeart size={20} color="#000000" />
          <span>{saveLabel}</span>
        </button>
        <button className={styles.shareBtn} onClick={() => void handleShare()}>
          <IconShare size={20} color="var(--cp-text-primary)" />
        </button>
      </div>
    </>
  );
}
