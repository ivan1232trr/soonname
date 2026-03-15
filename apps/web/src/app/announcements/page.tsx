import BottomNav from "@/components/BottomNav";
import styles from "./page.module.css";

export default function AnnouncementsPage() {
  return (
    <div className="shell">
      <div className={styles.header}>
        <h1 className={styles.title}>Announcements</h1>
      </div>
      <div className={styles.empty}>
        <p className={styles.emptyText}>No announcements yet.</p>
      </div>
      <BottomNav />
    </div>
  );
}
