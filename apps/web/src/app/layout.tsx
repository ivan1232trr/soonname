// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-14
// Prompt summary: Next.js 15 App Router root layout with HTML shell and metadata for CityPulse web app
// Reviewed by: unreviewed

// ── Imports ───────────────────────────────────────────────────────────────────

// Next.js Metadata type for the exported metadata object; drives <head> tags
import type { Metadata } from "next";
// React type for children prop used in the layout component signature
import type { ReactNode } from "react";

// ── Metadata ──────────────────────────────────────────────────────────────────

/**
 * Next.js route segment metadata exported from the root layout.
 * Populates <title> and <meta name="description"> for the entire app.
 */
// Exported as a named constant so Next.js picks it up automatically via the metadata convention
export const metadata: Metadata = {
  // Browser tab title and search engine headline for the application
  title: "CityPulse — What's happening in Kingston",
  // Short description used by search engines and social link previews
  description: "Discover events happening near you in Kingston, Jamaica.",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Root layout component for the Next.js 15 App Router.
 * Wraps every page in the HTML document shell.
 * All pages in the app directory are rendered as children inside the <body> tag.
 *
 * @param children - Page or nested layout content rendered by Next.js into this slot
 * @returns        - A full HTML document tree containing the page content
 * @sideEffects    - None; this is a pure server component
 */
export default function RootLayout({
  // Destructure children from props; represents the active page or nested layout
  children,
}: {
  // Next.js passes ReactNode children to every layout component automatically
  children: ReactNode;
}) {
  return (
    // Set the document language to English for screen readers and search engines
    <html lang="en">
      {/*
        body tag wraps all page content.
        Inline styles are kept minimal for this prototype — styling will be added post-scaffold.
        margin: 0 removes the default browser margin so the layout starts from the edge.
      */}
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {/* Render the active page component inside the body; Next.js manages this automatically */}
        {children}
      </body>
    </html>
  );
}
