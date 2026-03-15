"use client";

import { useRouter } from "next/navigation";
import { IconCheck } from "@/components/icons";
import styles from "./page.module.css";

export default function FeedReadyPage() {
  const router = useRouter();

  return (
    <div className="shell">
      <div className={styles.content}>
        <div className={styles.checkCircle}>
          <IconCheck size={40} color="#ffffff" strokeWidth={2.5} />
        </div>

        <h1 className={styles.heading}>{`Your feed\nis ready.`}</h1>
        <p className={styles.subheading}>{`We'll show you Austin events\nthat match your vibe.`}</p>

        <button className={styles.letsGoBtn} onClick={() => router.push("/")}>
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
