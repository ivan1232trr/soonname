// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Card component for displaying event snippets in a scrollable feed
// Reviewed by: unreviewed

import Link from "next/link";
import { IconMapPin, IconHeart } from "./icons";
import styles from "./EventCard.module.css";

/**
 * Data structure for the EventCard component.
 * Maps to the core IEvent interface but focused on UI display requirements.
 */
export interface EventCardData {
  // Unique database identifier for navigation
  id: string;
  // Primary event headline
  title: string;
  // Formatted date/time string for display
  datetime: string;
  // Human-readable location or venue name
  location: string;
  // Array of tag slugs (e.g. ['nightlife', 'free'])
  tags: string[];
  // Hex color code mapped to the event's category for visual branding
  categoryColor: string;
}

/**
 * EventCard Component
 * 
 * Renders a compact summary of an event with category-specific accenting.
 * Tapping the card navigates the user to the full event detail page.
 * 
 * @param event - The event data to render
 * @returns - A clickable card component
 */
export default function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link href={`/event/${event.id}`} className={styles.card}>
      {/* Visual accent bar colored based on the event's AI-assigned category */}
      <div className={styles.colorBar} style={{ background: event.categoryColor }} />
      
      {/* Main content area of the card */}
      <div className={styles.body}>
        {/* Primary event title; styled for readability in dense lists */}
        <p className={styles.title}>{event.title}</p>
        
        {/* Secondary information: Event date and time info */}
        <p className={styles.datetime}>{event.datetime}</p>
        
        {/* Location row featuring a pin icon and truncated venue name */}
        <div className={styles.locationRow}>
          <IconMapPin size={14} color="var(--cp-text-tertiary)" />
          <span className={styles.locationText}>{event.location}</span>
        </div>
        
        {/* Footer row containing tag chips and the interest (heart) action */}
        <div className={styles.tagRow}>
          <div className={styles.tags}>
            {/* Map over tags to render individual non-interactive chips */}
            {event.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
          {/* Heart icon for saving events; placeholder for future interactive state */}
          <IconHeart size={20} color="var(--cp-text-tertiary)" />
        </div>
      </div>
    </Link>
  );
}
