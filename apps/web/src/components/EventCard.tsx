import Link from "next/link";
import { IconMapPin, IconHeart } from "./icons";
import styles from "./EventCard.module.css";

export interface EventCardData {
  id: string;
  title: string;
  datetime: string;
  location: string;
  tags: string[];
  categoryColor: string;
}

export default function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link href={`/event/${event.id}`} className={styles.card}>
      <div className={styles.colorBar} style={{ background: event.categoryColor }} />
      <div className={styles.body}>
        <p className={styles.title}>{event.title}</p>
        <p className={styles.datetime}>{event.datetime}</p>
        <div className={styles.locationRow}>
          <IconMapPin size={14} color="var(--cp-text-tertiary)" />
          <span className={styles.locationText}>{event.location}</span>
        </div>
        <div className={styles.tagRow}>
          <div className={styles.tags}>
            {event.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
          <IconHeart size={20} color="var(--cp-text-tertiary)" />
        </div>
      </div>
    </Link>
  );
}
