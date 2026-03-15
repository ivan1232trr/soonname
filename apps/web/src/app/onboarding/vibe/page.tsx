"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCoffee, IconZap } from "@/components/icons";
import styles from "./page.module.css";

type Vibe = "chill" | "social" | null;

export default function VibePreferencePage() {
  const [selected, setSelected] = useState<Vibe>("chill");
  const router = useRouter();

  return (
    <div className="shell">
      <div className={styles.content}>
        <p className={styles.brand}>CityPulse</p>

        <div className={styles.spacer32} />

        <div className={styles.dots}>
          <span className={`${styles.dot} ${styles.dotActive}`} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>

        <div className={styles.spacer24} />

        <h1 className={styles.heading}>{`What's your\nvibe?`}</h1>
        <p className={styles.subheading}>This helps us personalize your event feed.</p>

        <div className={styles.spacer32} />

        <div className={styles.cardRow}>
          <button
            className={`${styles.vibeCard} ${selected === "chill" ? styles.cardSelected : ""}`}
            onClick={() => setSelected("chill")}
          >
            <IconCoffee size={28} color={selected === "chill" ? "var(--cp-primary)" : "var(--cp-text-muted)"} />
            <span className={styles.cardTitle}>Chill</span>
            <span className={styles.cardDesc}>Low-key hangouts, small gatherings, quiet spots</span>
          </button>

          <button
            className={`${styles.vibeCard} ${selected === "social" ? styles.cardSelected : ""}`}
            onClick={() => setSelected("social")}
          >
            <IconZap size={28} color={selected === "social" ? "var(--cp-primary)" : "var(--cp-text-muted)"} />
            <span className={styles.cardTitle}>Social</span>
            <span className={styles.cardDesc}>Parties, big events, meeting new people</span>
          </button>
        </div>

        <div className={styles.spacer16} />

        <button className={styles.bothBtn} onClick={() => router.push("/onboarding/times")}>
          Both / Depends
        </button>

        <div className={styles.flex} />

        <button className={styles.continueBtn} onClick={() => router.push("/onboarding/times")}>
          Continue
        </button>
      </div>
    </div>
  );
}
