"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const TAGS = [
  ["Music", "Art", "Food & Drink"],
  ["Fitness", "Nightlife", "Outdoors"],
  ["Tech", "Comedy", "Film", "Wellness"],
  ["Markets", "Sports", "Free Events"],
  ["Community"],
];

const DEFAULT_SELECTED = new Set(["Music", "Food & Drink", "Fitness", "Film", "Free Events"]);

export default function InterestsPage() {
  const [selected, setSelected] = useState<Set<string>>(DEFAULT_SELECTED);
  const router = useRouter();

  const toggle = (tag: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  return (
    <div className="shell">
      <div className={styles.content}>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={`${styles.dot} ${styles.dotActive}`} />
        </div>

        <div className={styles.spacer24} />

        <h1 className={styles.heading}>What are you into?</h1>
        <p className={styles.subheading}>Pick at least 3</p>

        <div className={styles.spacer24} />

        <div className={styles.tagGrid}>
          {TAGS.map((row, i) => (
            <div key={i} className={styles.tagRow}>
              {row.map((tag) => {
                const active = selected.has(tag);
                return (
                  <button
                    key={tag}
                    className={`${styles.tag} ${active ? styles.tagActive : ""}`}
                    onClick={() => toggle(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.flex} />

        <button className={styles.continueBtn} onClick={() => router.push("/onboarding/ready")}>
          Continue
        </button>
      </div>
    </div>
  );
}
