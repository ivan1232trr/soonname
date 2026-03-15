"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EventCategory } from "@citypulse/types";
import {
  IconMapPin,
  IconCalendar,
  IconClock,
  IconSend,
  IconSparkles,
  IconCheck,
} from "@/components/icons";
import {
  ApiError,
  createEvent,
  getCities,
  previewClassification,
} from "@/lib/api";
import type { ApiCity, ApiEvent } from "@/lib/api-types";
import { getStoredToken } from "@/lib/auth-storage";
import { getCategoryColor, getCategoryLabel } from "@/lib/event-presentation";
import styles from "./page.module.css";

export default function PostEventPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [cities, setCities] = useState<ApiCity[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cityId, setCityId] = useState("");
  const [latitude, setLatitude] = useState(18.0179);
  const [longitude, setLongitude] = useState(-76.8099);

  // AI preview state
  const [aiPreview, setAiPreview] = useState<{
    category: string | null;
    tags: string[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<ApiEvent | null>(null);

  useEffect(() => {
    setToken(getStoredToken());

    const loadCities = async () => {
      try {
        const response = await getCities();
        setCities(response);
        if (response[0] !== undefined) {
          setCityId(response[0].id);
          setLatitude(response[0].latitude);
          setLongitude(response[0].longitude);
        }
      } catch {
        // Cities load failure is non-critical
      }
    };

    void loadCities();
  }, []);

  const handleCityChange = (newCityId: string) => {
    setCityId(newCityId);
    const city = cities.find((c) => c.id === newCityId);
    if (city !== undefined) {
      setLatitude(city.latitude);
      setLongitude(city.longitude);
    }
  };

  const handleAiPreview = async () => {
    if (token === null || title.length < 3 || description.length < 20) {
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const result = await previewClassification(token, { title, description });
      setAiPreview({ category: result.category, tags: result.tags });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "AI preview failed — you can still submit without it."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (token === null) {
      return;
    }

    if (
      title.length < 3 ||
      description.length < 20 ||
      locationName === "" ||
      eventDate === "" ||
      startTime === "" ||
      cityId === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const startDateTime = `${eventDate}T${startTime}:00`;
    const endDateTime =
      endTime !== "" ? `${eventDate}T${endTime}:00` : undefined;

    try {
      const input: Parameters<typeof createEvent>[1] = {
        title,
        description,
        locationName,
        latitude,
        longitude,
        eventDate,
        startTime: new Date(startDateTime).toISOString(),
        cityId,
      };

      if (endDateTime !== undefined) {
        input.endTime = new Date(endDateTime).toISOString();
      }

      const event = await createEvent(token, input);
      setSubmitted(event);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to post event"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Not authenticated
  if (token === null) {
    return (
      <div className="shell">
        <div className={styles.navHeader}>
          <button className={styles.cancelBtn} onClick={() => router.back()}>
            Cancel
          </button>
          <span className={styles.headerTitle}>Post Event</span>
          <div className={styles.spacer50} />
        </div>
        <div className={styles.authGate}>
          <p className={styles.authGateTitle}>Sign in to post</p>
          <p className={styles.authGateBody}>
            You need to be signed in to submit events. Your event will be
            analyzed by AI to assign a category and tags automatically.
          </p>
          <Link href="/profile" className={styles.authGateLink}>
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  // Successfully submitted
  if (submitted !== null) {
    const isPending = submitted.status === "PENDING_CLASSIFICATION";
    return (
      <div className="shell">
        <div className={styles.navHeader}>
          <div className={styles.spacer50} />
          <span className={styles.headerTitle}>Event Posted</span>
          <div className={styles.spacer50} />
        </div>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            {isPending ? (
              <IconSparkles size={32} color="#ffffff" />
            ) : (
              <IconCheck size={32} color="#ffffff" />
            )}
          </div>
          <p className={styles.successTitle}>
            {isPending ? "AI is classifying your event" : "Event is live!"}
          </p>
          <p className={styles.successBody}>
            {isPending
              ? `"${submitted.title}" has been submitted. Our AI is analyzing it to assign a category and tags. It will appear in the feed once classification is complete.`
              : `"${submitted.title}" is now live in the feed. Browse events to see it.`}
          </p>
          <Link href={`/event/${submitted.id}`} className={styles.authGateLink}>
            View Event
          </Link>
          <Link href="/post/my-events" className={styles.successBtn}>
            My Events
          </Link>
        </div>
      </div>
    );
  }

  const canPreview = title.length >= 3 && description.length >= 20;

  return (
    <div className="shell">
      <div className={styles.navHeader}>
        <button className={styles.cancelBtn} onClick={() => router.back()}>
          Cancel
        </button>
        <span className={styles.headerTitle}>Post Event</span>
        <div className={styles.spacer50} />
      </div>

      <div className={styles.formScroll}>
        <div className={styles.field}>
          <label className={styles.label}>City</label>
          <div className={styles.selectRow}>
            <select
              className={styles.select}
              value={cityId}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.country}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Event Title</label>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              placeholder="Jazz Night at The Velvet Room"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <span className={styles.charCount}>{title.length}/100</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <div className={styles.textareaWrap}>
            <textarea
              className={styles.textarea}
              placeholder="An immersive night of underground jazz fused with electronic beats. Describe your event in detail so our AI can classify it accurately..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <button
            className={`${styles.aiBtn} ${aiLoading ? styles.pulsing : ""}`}
            disabled={!canPreview || aiLoading}
            onClick={() => void handleAiPreview()}
          >
            <IconSparkles size={16} color="#650386" />
            <span>{aiLoading ? "Analyzing..." : "Preview AI Classification"}</span>
          </button>
        </div>

        {aiPreview !== null ? (
          <div className={styles.aiPreview}>
            <p className={styles.aiPreviewTitle}>
              <IconSparkles size={14} color="#cc33ff" />
              AI Classification Preview
            </p>
            {aiPreview.category !== null ? (
              <span
                className={styles.aiCategory}
                style={{
                  background: getCategoryColor(
                    aiPreview.category as EventCategory
                  ),
                }}
              >
                {getCategoryLabel(aiPreview.category as EventCategory)}
              </span>
            ) : (
              <span className={styles.aiCategory} style={{ background: "var(--cp-border-muted)" }}>
                No AI configured
              </span>
            )}
            {aiPreview.tags.length > 0 ? (
              <div className={styles.aiTags}>
                {aiPreview.tags.map((tag) => (
                  <span key={tag} className={styles.aiTag}>
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.field}>
          <label className={styles.label}>Location</label>
          <div className={styles.inputIconRow}>
            <IconMapPin size={18} color="var(--cp-text-tertiary)" />
            <input
              className={styles.inputBare}
              placeholder="The Velvet Room, Kingston"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.dateTimeRow}>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <div className={styles.inputIconRow}>
              <IconCalendar size={18} color="var(--cp-text-tertiary)" />
              <input
                className={styles.inputBare}
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Start Time</label>
            <div className={styles.inputIconRow}>
              <IconClock size={18} color="var(--cp-text-tertiary)" />
              <input
                className={styles.inputBare}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>End Time (optional)</label>
          <div className={styles.inputIconRow}>
            <IconClock size={18} color="var(--cp-text-tertiary)" />
            <input
              className={styles.inputBare}
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error !== null ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.submitFooter}>
        <button
          className={styles.postBtn}
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          <IconSend size={18} color="#ffffff" />
          <span>{submitting ? "Posting..." : "Post Event"}</span>
        </button>
      </div>
    </div>
  );
}
