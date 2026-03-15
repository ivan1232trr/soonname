"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAnnouncements, getSuggestedEvent } from "@/lib/api";
import { ApiAnnouncement, ApiEventSuggestion } from "@/lib/api-types";
import { getCategoryColor, getCategoryLabel } from "@/lib/event-presentation";
import styles from "./page.module.css";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [suggestion, setSuggestion] = useState<ApiEventSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getAnnouncements();
        setAnnouncements(data);
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    })();

    void (async () => {
      try {
        const data = await getSuggestedEvent();
        setSuggestion(data);
        // let the bubble animate in first, then reveal the card
        setTimeout(() => setCardVisible(true), 600);
      } catch {
        setSuggestionLoading(false);
      } finally {
        setSuggestionLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Announcements</h1>
      </div>

      <div className={styles.content}>

        {/* ── AI bubble + event card ─────────────────────────── */}
        <div className={styles.aiSection}>

          {suggestionLoading ? (
            <div className={styles.bubbleWrap}>
              <div className={styles.avatarDot} />
              <div className={`${styles.bubble} ${styles.bubbleTyping}`}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          ) : suggestion !== null ? (
            <>
              {/* chat bubble */}
              <div className={styles.bubbleWrap}>
                <div className={styles.avatarDot}>✦</div>
                <div className={styles.bubble}>
                  <p className={styles.bubbleText}>Here&apos;s an event you&apos;d like.</p>
                </div>
              </div>

              {/* event card slides in after bubble */}
              <Link
                href={`/event/${suggestion.event.id}`}
                className={`${styles.eventCard} ${cardVisible ? styles.eventCardVisible : ""}`}
              >
                {suggestion.event.category !== null && (
                  <span
                    className={styles.categoryBar}
                    style={{ background: getCategoryColor(suggestion.event.category) }}
                  />
                )}
                <div className={styles.cardBody}>
                  {suggestion.event.category !== null && (
                    <span
                      className={styles.categoryChip}
                      style={{
                        background: getCategoryColor(suggestion.event.category) + "22",
                        color: getCategoryColor(suggestion.event.category),
                      }}
                    >
                      {getCategoryLabel(suggestion.event.category)}
                    </span>
                  )}
                  <p className={styles.eventTitle}>{suggestion.event.title}</p>
                  <p className={styles.eventReason}>{suggestion.reason}</p>
                  <p className={styles.eventLocation}>{suggestion.event.locationName}</p>
                </div>
              </Link>
            </>
          ) : null}
        </div>

        {/* ── Announcements list ─────────────────────────────── */}
        {!loading && (
          announcements.length > 0 ? (
            <div className={styles.list}>
              {announcements.map((ann) => (
                <div key={ann.id} className={styles.announcement}>
                  <div className={styles.annHeader}>
                    <h2 className={styles.annTitle}>{ann.title}</h2>
                    {ann.priority > 0 && (
                      <span
                        className={styles.priorityBadge}
                        style={{ backgroundColor: ann.priority === 2 ? "#ef4444" : "#f59e0b" }}
                      >
                        {ann.priority === 2 ? "Urgent" : "Update"}
                      </span>
                    )}
                  </div>
                  <p className={styles.annContent}>{ann.content}</p>
                  <p className={styles.annDate}>
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyAnn}>
              <p className={styles.emptyText}>You&apos;re all caught up!</p>
            </div>
          )
        )}
      </div>
    </>
  );
}
