"use client";

import { useEffect, useRef, useState } from "react";
import EventCard, { type EventCardData } from "./EventCard";
import styles from "./MobileLazyEventCard.module.css";

interface MobileLazyEventCardProps {
  event: EventCardData;
  eager?: boolean;
}

const LOAD_AHEAD_MARGIN = "240px 0px";

export default function MobileLazyEventCard({
  event,
  eager = false,
}: MobileLazyEventCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(eager);

  useEffect(() => {
    if (eager || hasEnteredViewport) {
      return;
    }

    const container = containerRef.current;
    if (container === null || typeof IntersectionObserver === "undefined") {
      setHasEnteredViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting !== true) {
          return;
        }

        setHasEnteredViewport(true);
        observer.disconnect();
      },
      { rootMargin: LOAD_AHEAD_MARGIN }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [eager, hasEnteredViewport]);

  return (
    <div ref={containerRef} className={styles.shell}>
      {hasEnteredViewport ? (
        <EventCard event={event} />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <div className={styles.colorBar} style={{ background: event.categoryColor }} />
          <div className={styles.body}>
            <div className={styles.titlePlaceholder} />
            <div className={styles.datetimePlaceholder} />
            <div className={styles.locationPlaceholder} />
            <div className={styles.tagRow}>
              <div className={styles.tagPlaceholder} />
              <div className={styles.tagPlaceholderShort} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
