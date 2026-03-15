"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSunrise, IconSun, IconSunset, IconMoon } from "@/components/icons";
import styles from "./page.module.css";

const TIME_SLOTS = [
  { id: "morning", label: "Morning", sub: "6am – 12pm", Icon: IconSunrise },
  { id: "afternoon", label: "Afternoon", sub: "12pm – 5pm", Icon: IconSun },
  { id: "evening", label: "Evening", sub: "5pm – 10pm", Icon: IconSunset },
  { id: "latenight", label: "Late Night", sub: "10pm+", Icon: IconMoon },
];

export default function TimesPreferencePage() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["afternoon", "evening"]));
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="shell">
      <div className={styles.content}>
        <p className={styles.brand}>Event GO</p>

        <div className={styles.spacer32} />

        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={`${styles.dot} ${styles.dotActive}`} />
          <span className={styles.dot} />
        </div>

        <div className={styles.spacer24} />

        <h1 className={styles.heading}>{`When do you\nusually go out?`}</h1>
        <p className={styles.subheading}>Select all that apply.</p>

        <div className={styles.spacer32} />

        <div className={styles.grid}>
          {TIME_SLOTS.map(({ id, label, sub, Icon }) => {
            const active = selected.has(id);
            return (
              <button
                key={id}
                className={`${styles.timeCard} ${active ? styles.cardSelected : ""}`}
                onClick={() => toggle(id)}
              >
                <Icon size={24} color={active ? "var(--cp-primary)" : "var(--cp-text-muted)"} />
                <span className={styles.cardLabel}>{label}</span>
                <span className={styles.cardSub}>{sub}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.flex} />

        <button className={styles.continueBtn} onClick={() => router.push("/onboarding/interests")}>
          Continue
        </button>
      </div>
    </div>
  );
}
