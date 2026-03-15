// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Announcements feed component that fetches system alerts from the API
// Reviewed by: unreviewed

"use client";

import { useEffect, useState } from "react";
import { getAnnouncements } from "@/lib/api";
import { ApiAnnouncement } from "@/lib/api-types";
import styles from "./page.module.css";

/**
 * AnnouncementsPage Component
 * 
 * Fetches and displays a list of system-wide announcements.
 * Announcements are ordered by priority (Urgent > Warning > Info).
 * 
 * @returns - The announcements feed UI
 */
export default function AnnouncementsPage() {
  // List of fetched announcement objects
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  // Loading state for initial API call
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Internal fetcher for the announcements list.
     */
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

    void loadAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Checking for updates...</p>
      </div>
    );
  }

  return (
    <>
      {/* Feed header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Announcements</h1>
      </div>

      <div className={styles.content}>
        {announcements.length > 0 ? (
          <div className={styles.list}>
            {announcements.map((ann) => (
              /* Announcement card with priority-based highlights */
              <div key={ann.id} className={styles.announcement}>
                <div className={styles.annHeader}>
                  <h2 className={styles.annTitle}>{ann.title}</h2>
                  {/* Visual indicator for urgent/high priority messages */}
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
          /* Empty state when no active announcements exist */
          <div className={styles.empty}>
            <p className={styles.emptyText}>You're all caught up! No announcements yet.</p>
          </div>
        )}
      </div>
    </>
  );
}
