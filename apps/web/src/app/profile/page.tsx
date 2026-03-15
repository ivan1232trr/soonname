import BottomNav from "@/components/BottomNav";
import { IconPencil, IconRefreshCw } from "@/components/icons";
import styles from "./page.module.css";

export default function ProfilePage() {
  return (
    <div className="shell">
      <div className={styles.header}>
        <div className={styles.avatar}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cp-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <p className={styles.username}>@Austin, TX</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Your Vibe</p>
          <div className={styles.tagRow}>
            <span className={styles.tagPrimary}>Social</span>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>When you go out</p>
          <div className={styles.tagRow}>
            <span className={styles.tagPrimary}>Evening</span>
            <span className={styles.tagPrimary}>Late Night</span>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Your Interests</p>
          <div className={styles.tagRow}>
            <span className={styles.tagMuted}>Music</span>
            <span className={styles.tagMuted}>Nightlife</span>
            <span className={styles.tagMuted}>Food &amp; Drink</span>
            <span className={styles.tagMuted}>Comedy</span>
            <span className={styles.tagMuted}>Art</span>
            <span className={styles.tagMuted}>Outdoors</span>
            <span className={styles.tagMore}>+5 more</span>
          </div>
        </div>

        <div className={styles.actionList}>
          <button className={styles.actionItem}>
            <div className={styles.actionLeft}>
              <IconPencil size={16} color="var(--cp-primary)" />
              <span>Edit Profile</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
          <div className={styles.actionDivider} />
          <button className={styles.actionItem}>
            <div className={styles.actionLeft}>
              <IconRefreshCw size={16} color="#ef4444" />
              <span>Reset Interest Profile</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
        </div>

        <p className={styles.privacy}>Privacy</p>
      </div>

      <BottomNav />
    </div>
  );
}
