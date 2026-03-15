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

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await getAnnouncements();
        setAnnouncements(data);
      } catch (err) {
        console.error("Failed to load announcements", err);
      } finally {
        setLoading(false);
      }
    };

    const loadSuggestion = async () => {
      try {
        const data = await getSuggestedEvent();
        setSuggestion(data);
      } catch {
        // Silently fail — suggestion is non-critical
      } finally {
        setSuggestionLoading(false);
      }
    };

    void loadAnnouncements();
    void loadSuggestion();
  }, []);

  if (loading && suggestionLoading) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Checking for updates...</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Announcements</h1>
      </div>

      <div className={styles.content}>
        {/* AI event suggestion */}
        <div className={styles.suggestSection}>
          <p className={styles.suggestLabel}>✦ AI Pick</p>
          {suggestionLoading ? (
            <div className={styles.suggestSkeleton}>
              <p className={styles.skeletonText}>Finding the best event for you…</p>
            </div>
          ) : suggestion !== null ? (
            <Link href={`/event/${suggestion.event.id}`} className={styles.suggestCard}>
              {suggestion.event.category !== null && (
                <span
                  className={styles.suggestCategoryBar}
                  style={{ background: getCategoryColor(suggestion.event.category) }}
                />
              )}
              <div className={styles.suggestBody}>
                <div className={styles.suggestTop}>
                  {suggestion.event.category !== null && (
                    <span
                      className={styles.suggestChip}
                      style={{ background: getCategoryColor(suggestion.event.category) + "22", color: getCategoryColor(suggestion.event.category) }}
                    >
                      {getCategoryLabel(suggestion.event.category)}
                    </span>
                  )}
                </div>
                <p className={styles.suggestTitle}>{suggestion.event.title}</p>
                <p className={styles.suggestReason}>{suggestion.reason}</p>
                <p className={styles.suggestLocation}>{suggestion.event.locationName}</p>
              </div>
            </Link>
          ) : (
            <div className={styles.suggestSkeleton}>
              <p className={styles.skeletonText}>No events available right now.</p>
            </div>
          )}
        </div>

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
                        style={{
                          backgroundColor: ann.priority === 2 ? "#ef4444" : "#f59e0b"
                        }}
                      >
                        {ann.priority === 2 ? "Urgent" : "Update"}
                      </span>
                    )}
                  </div>
                  <p className={styles.annContent}>{ann.content}</p>
                  <p className={styles.annDate}>
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyText}>You're all caught up! No announcements yet.</p>
            </div>
          )
        )}
      </div>
    </>
  );
}
