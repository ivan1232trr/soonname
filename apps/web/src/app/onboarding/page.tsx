"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconMapPin, IconNavigation } from "@/components/icons";
import styles from "./page.module.css";

const SUGGESTIONS = ["Austin, TX", "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX"];

export default function CitySelectionPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = query
    ? SUGGESTIONS.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : SUGGESTIONS;

  return (
    <div className="shell">
      <div className={styles.content}>
        <p className={styles.brand}>Event GO</p>

        <div className={styles.spacer64} />

        <h1 className={styles.heading}>What city{"\n"}are you in?</h1>
        <p className={styles.subheading}>We&apos;ll show you events happening near you.</p>

        <div className={styles.spacer32} />

        <div className={styles.searchBox}>
          <IconSearch size={18} color="var(--cp-text-muted)" />
          <input
            className={styles.searchInput}
            placeholder="Search for a city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.spacer8} />

        <div className={styles.suggList}>
          {filtered.map((city, i) => (
            <button
              key={city}
              className={`${styles.suggItem} ${i < filtered.length - 1 ? styles.suggBorder : ""}`}
              onClick={() => router.push("/onboarding/vibe")}
            >
              <IconMapPin size={16} color={i === 0 && !query ? "var(--cp-primary)" : "var(--cp-text-muted)"} />
              <span>{city}</span>
            </button>
          ))}
        </div>

        <div className={styles.flex} />

        <button className={styles.locationBtn} onClick={() => router.push("/onboarding/vibe")}>
          <IconNavigation size={16} color="var(--cp-text-secondary)" />
          <span>Use my current location</span>
        </button>
      </div>
    </div>
  );
}
