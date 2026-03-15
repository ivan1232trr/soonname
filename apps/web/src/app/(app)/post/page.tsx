"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  IconNavigation,
  IconMap,
  IconChevronDown,
  IconX,
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

interface SelectOption {
  label: string;
  value: string;
}

const DEFAULT_COORDINATES = {
  latitude: 18.0179,
  longitude: -76.8099,
};

const padNumber = (value: number): string => String(value).padStart(2, "0");

const formatDateValue = (value: Date): string =>
  `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;

const buildDateOptions = (daysToShow: number): SelectOption[] => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: daysToShow }, (_, index) => {
    const optionDate = new Date(today);
    optionDate.setDate(today.getDate() + index);

    const prefix =
      index === 0 ? "Today" : index === 1 ? "Tomorrow" : formatter.format(optionDate);

    return {
      value: formatDateValue(optionDate),
      label:
        index <= 1
          ? `${prefix} · ${formatter.format(optionDate)}`
          : formatter.format(optionDate),
    };
  });
};

const buildTimeOptions = (stepMinutes: number): SelectOption[] =>
  Array.from({ length: (24 * 60) / stepMinutes }, (_, index) => {
    const totalMinutes = index * stepMinutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const meridiem = hour >= 12 ? "PM" : "AM";

    return {
      value: `${padNumber(hour)}:${padNumber(minute)}`,
      label: `${hour12}:${padNumber(minute)} ${meridiem}`,
    };
  });

const DATE_OPTIONS = buildDateOptions(60);
const TIME_OPTIONS = buildTimeOptions(30);

const toIsoDateTime = (date: string, time: string): string | null => {
  const value = new Date(`${date}T${time}:00`);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString();
};

export default function PostEventPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [cities, setCities] = useState<ApiCity[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [eventDate, setEventDate] = useState(DATE_OPTIONS[0]?.value ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [cityId, setCityId] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_COORDINATES.latitude);
  const [longitude, setLongitude] = useState(DEFAULT_COORDINATES.longitude);

  // Location state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapLat, setMapLat] = useState(DEFAULT_COORDINATES.latitude);
  const [mapLng, setMapLng] = useState(DEFAULT_COORDINATES.longitude);

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

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow location access."
            : "Could not get your location. Try again."
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenMap = () => {
    setMapLat(latitude);
    setMapLng(longitude);
    setShowMap(true);
  };

  const handleConfirmMapLocation = () => {
    setLatitude(mapLat);
    setLongitude(mapLng);
    setShowMap(false);
  };

  const handleAiPreview = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (
      token === null ||
      trimmedTitle.length < 3 ||
      trimmedDescription.length < 20
    ) {
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const result = await previewClassification(token, {
        title: trimmedTitle,
        description: trimmedDescription,
      });
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

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocationName = locationName.trim();

    if (
      trimmedTitle.length < 3 ||
      trimmedDescription.length < 20 ||
      trimmedLocationName === "" ||
      eventDate === "" ||
      startTime === "" ||
      cityId === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const startDateTime = toIsoDateTime(eventDate, startTime);
    if (startDateTime === null) {
      setError("Select a valid start date and time.");
      return;
    }

    const endDateTime = endTime === "" ? null : toIsoDateTime(eventDate, endTime);
    if (endTime !== "" && endDateTime === null) {
      setError("Select a valid end time.");
      return;
    }

    if (
      endDateTime !== null &&
      new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()
    ) {
      setError("End time must be later than the start time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const input: Parameters<typeof createEvent>[1] = {
        title: trimmedTitle,
        description: trimmedDescription,
        locationName: trimmedLocationName,
        latitude,
        longitude,
        eventDate,
        startTime: startDateTime,
        cityId,
      };

      if (endDateTime !== null) {
        input.endTime = endDateTime;
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
      <>
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
      </>
    );
  }

  // Successfully submitted
  if (submitted !== null) {
    const isPending = submitted.status === "PENDING_CLASSIFICATION";
    return (
      <>
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
      </>
    );
  }

  const canPreview = title.trim().length >= 3 && description.trim().length >= 20;

  return (
    <>
      <div className={styles.navHeader}>
        <button className={styles.cancelBtn} onClick={() => router.back()}>
          Cancel
        </button>
        <span className={styles.headerTitle}>Post Event</span>
        <div className={styles.spacer50} />
      </div>

      <form
        className={styles.formShell}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className={styles.formScroll}>
          <div className={styles.field}>
            <label className={styles.label}>City</label>
            <div className={styles.selectRow}>
              <select
                className={styles.select}
                value={cityId}
                onChange={(event) => handleCityChange(event.target.value)}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.country}
                  </option>
                ))}
              </select>
              <IconChevronDown size={16} color="var(--cp-text-tertiary)" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Event Title</label>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                placeholder="Jazz Night at The Velvet Room"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
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
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>
            <button
              type="button"
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
                <span
                  className={styles.aiCategory}
                  style={{ background: "var(--cp-border-muted)" }}
                >
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
            <label className={styles.label}>Location Name</label>
            <div className={styles.inputIconRow}>
              <IconMapPin size={18} color="var(--cp-text-tertiary)" />
              <input
                className={styles.inputBare}
                placeholder="The Velvet Room, Kingston"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Event Coordinates</label>
            <div className={styles.locationActions}>
              <button
                type="button"
                className={`${styles.locationBtn} ${gpsLoading ? styles.pulsing : ""}`}
                disabled={gpsLoading}
                onClick={handleUseGps}
              >
                <IconNavigation size={14} color="currentColor" />
                {gpsLoading ? "Locating..." : "Use My GPS"}
              </button>
              <button
                type="button"
                className={styles.locationBtn}
                onClick={handleOpenMap}
              >
                <IconMap size={14} color="currentColor" />
                Pick on Map
              </button>
            </div>
            <span className={styles.coordsHint}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <div className={styles.selectRow}>
              <IconCalendar size={18} color="var(--cp-text-tertiary)" />
              <select
                className={styles.select}
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              >
                <option value="">Select a date</option>
                {DATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <IconChevronDown size={16} color="var(--cp-text-tertiary)" />
            </div>
          </div>

          <div className={styles.timeGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Start Time</label>
              <div className={styles.selectRow}>
                <IconClock size={18} color="var(--cp-text-tertiary)" />
                <select
                  className={`${styles.select} ${startTime === "" ? styles.selectEmpty : ""}`}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                >
                  <option value="">Select start</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown size={16} color="var(--cp-text-tertiary)" />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>End Time</label>
              <div className={styles.selectRow}>
                <IconClock size={18} color="var(--cp-text-tertiary)" />
                <select
                  className={`${styles.select} ${endTime === "" ? styles.selectEmpty : ""}`}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                >
                  <option value="">Optional</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown size={16} color="var(--cp-text-tertiary)" />
              </div>
            </div>
          </div>
        </div>

        {error !== null ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.submitFooter}>
          <button className={styles.postBtn} disabled={submitting} type="submit">
            <IconSend size={18} color="#ffffff" />
            <span>{submitting ? "Posting..." : "Post Event"}</span>
          </button>
        </div>
      </form>

      {showMap ? (
        <MapPickerModal
          lat={mapLat}
          lng={mapLng}
          onMove={(lat, lng) => {
            setMapLat(lat);
            setMapLng(lng);
          }}
          onConfirm={handleConfirmMapLocation}
          onClose={() => setShowMap(false)}
        />
      ) : null}
    </>
  );
}

/* ── Map Picker Modal ── */

function MapPickerModal({
  lat,
  lng,
  onMove,
  onConfirm,
  onClose,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // The map covers a small region around the initial center.
  // Clicking anywhere in the box moves the pin.
  const [center] = useState({ lat, lng });
  const SPAN_LAT = 0.03;
  const SPAN_LNG = 0.03;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPct = (e.clientX - rect.left) / rect.width;
      const yPct = (e.clientY - rect.top) / rect.height;

      const newLat = center.lat + SPAN_LAT / 2 - yPct * SPAN_LAT;
      const newLng = center.lng - SPAN_LNG / 2 + xPct * SPAN_LNG;

      onMove(
        Math.round(newLat * 10000) / 10000,
        Math.round(newLng * 10000) / 10000
      );
    },
    [center, onMove]
  );

  // Convert lat/lng back to pixel position in the box
  const pinXPct = ((lng - (center.lng - SPAN_LNG / 2)) / SPAN_LNG) * 100;
  const pinYPct = ((center.lat + SPAN_LAT / 2 - lat) / SPAN_LAT) * 100;

  return (
    <div className={styles.mapOverlay} onClick={onClose}>
      <div className={styles.mapModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.mapModalHeader}>
          <span className={styles.mapModalTitle}>Pick Location</span>
          <button className={styles.mapCloseBtn} onClick={onClose}>
            <IconX size={16} color="var(--cp-text-secondary)" />
          </button>
        </div>

        <div className={styles.mapContainer}>
          <div
            ref={containerRef}
            className={styles.mapPlaceholder}
            onClick={handleClick}
          >
            <div className={styles.mapGrid} />
            <div className={styles.mapCrosshair} />
            <div
              className={styles.mapPin}
              style={{
                left: `${Math.max(0, Math.min(100, pinXPct))}%`,
                top: `${Math.max(0, Math.min(100, pinYPct))}%`,
              }}
            >
              <IconMapPin size={28} color="#aa00e2" />
            </div>
          </div>
        </div>

        <div className={styles.mapModalFooter}>
          <span className={styles.mapCoords}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
          <button className={styles.mapConfirmBtn} onClick={onConfirm}>
            <IconCheck size={18} color="#ffffff" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
