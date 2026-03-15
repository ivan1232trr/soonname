// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Profile page component with dynamic data fetching, mock sign-in, and preference display
// Reviewed by: unreviewed

"use client";

import { useEffect, useState } from "react";
import { IconPencil, IconRefreshCw, IconLock } from "@/components/icons";
import { getMe, getMyProfile, login } from "@/lib/api";
import { ApiUser, ApiUserProfile } from "@/lib/api-types";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/auth-storage";
import styles from "./page.module.css";

/**
 * ProfilePage Component
 * 
 * Displays the user's account information and preference profile.
 * Provides a "Mock Sign In" path for easy development and testing.
 * 
 * @returns - The profile screen UI
 */
export default function ProfilePage() {
  // Authentication token retrieved from localStorage
  const [token, setToken] = useState<string | null>(null);
  // Authenticated user's account details
  const [user, setUser] = useState<ApiUser | null>(null);
  // User's preference profile (vibe, interests, etc.)
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  // Error state for failed API requests
  const [error, setError] = useState<string | null>(null);
  // Global loading state while fetching multi-step data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load: check if we have a session
    const storedToken = getStoredToken();
    setToken(storedToken);

    if (storedToken !== null) {
      loadUserData(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches the user account and profile data concurrently.
   * 
   * @param authToken - JWT to use for requests
   */
  const loadUserData = async (authToken: string) => {
    try {
      setLoading(true);
      // Fetch both account and profile in parallel
      const [u, p] = await Promise.all([
        getMe(authToken),
        getMyProfile(authToken).catch(() => null), // Capture 404 if profile not yet created
      ]);
      setUser(u);
      setProfile(p);
    } catch (err) {
      setError("Session expired or server error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mock Sign-In Handler
   * Verifies the hardcoded demo credentials and stores the resulting token.
   */
  const handleMockSignIn = async () => {
    try {
      setLoading(true);
      const res = await login({
        email: "demo@citypulse.app",
        password: "demo1234",
      });
      setStoredToken(res.token);
      setToken(res.token);
      await loadUserData(res.token);
    } catch (err) {
      setError("Mock sign-in failed. Ensure API is running and seeded.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign-Out Handler
   * Flushes global state and clears storage.
   */
  const handleSignOut = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Loading profile...</p>
      </div>
    );
  }

  // State: Not Signed In (Mock path)
  if (token === null || user === null) {
    return (
      <div className={styles.empty}>
        <div className={styles.lockIcon}>
          <IconLock size={48} color="var(--cp-text-muted)" />
        </div>
        <h2 className={styles.emptyTitle}>Sign in to Event GO</h2>
        <p className={styles.emptyText}>
          Personalize your feed, save events, and see your activity here.
        </p>
        <button className={styles.mockButton} onClick={handleMockSignIn}>
          Mock Sign In (Demo Account)
        </button>
        {error !== null && <p className={styles.errorText}>{error}</p>}
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        {/* User avatar and handle area */}
        <div className={styles.avatar}>
          <p className={styles.avatarInitial}>{user.name[0]}</p>
        </div>
        <div className={styles.headerInfo}>
          <p className={styles.username}>{user.name}</p>
          <p className={styles.userEmail}>{user.email}</p>
        </div>
      </div>

      <div className={styles.content}>
        {profile !== null ? (
          <>
            {/* Preference card: Vibe selection */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Your Vibe</p>
              <div className={styles.tagRow}>
                <span className={styles.tagPrimary}>{profile.vibe}</span>
              </div>
            </div>

            {/* Preference card: Time-of-day slots */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>When you go out</p>
              <div className={styles.tagRow}>
                {profile.timePreferences.map((time) => (
                  <span key={time} className={styles.tagPrimary}>{time}</span>
                ))}
              </div>
            </div>

            {/* Interest card: Tag chips */}
            <div className={styles.card}>
              <p className={styles.cardTitle}>Your Interests</p>
              <div className={styles.tagRow}>
                {profile.interestedTags.map((tag) => (
                  <span key={tag} className={styles.tagMuted}>{tag}</span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.card}>
            <p className={styles.cardTitle}>Profile Incomplete</p>
            <p className={styles.emptyText}>Complete onboarding to see your vibe and interests.</p>
          </div>
        )}

        {/* Global actions list */}
        <div className={styles.actionList}>
          <button className={styles.actionItem}>
            <div className={styles.actionLeft}>
              <IconPencil size={16} color="var(--cp-primary)" />
              <span>Edit Profile</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
          <div className={styles.actionDivider} />
          <button className={styles.actionItem} onClick={() => alert("Resetting interests...")}>
            <div className={styles.actionLeft}>
              <IconRefreshCw size={16} color="#ef4444" />
              <span>Reset Interest Profile</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
          <div className={styles.actionDivider} />
          {/* Sign out action for testing flows */}
          <button className={styles.actionItem} onClick={handleSignOut}>
            <div className={styles.actionLeft}>
              <IconRefreshCw size={16} color="var(--cp-text-muted)" />
              <span>Sign Out</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
        </div>

        <p className={styles.privacy}>Event GO Data Privacy Policy</p>
      </div>
    </>
  );
}
