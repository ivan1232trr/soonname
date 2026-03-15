// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Interactive Google Map component with dynamic markers, viewport change events, and custom night-mode styling
// Reviewed by: unreviewed

"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./GoogleMap.module.css";

// Declare global window properties needed for the Google Maps JS SDK bootstrap
declare global {
  interface Window {
    // The core Google Maps namespace, populated after the script loads
    google?: {
      maps?: any;
    };
    // Callback triggered by Google if the API key is invalid or restricted
    gm_authFailure?: () => void;
    // Internal callback used by the JSONP-style script loader to signal readiness
    __initGoogleMaps?: () => void;
  }
}

/**
 * Representation of an individual marker to be rendered on the map.
 */
interface MapMarker {
  id: string;      // Unique ID used for selection and cross-referencing with the feed
  title: string;   // Tooltip and accessibility label
  latitude: number;
  longitude: number;
}

/**
 * Represents the geographic bounds of the current map viewport.
 * Emitted to the parent component to trigger spatial filtering in the backend.
 */
export interface ViewportBounds {
  north: number; // Max latitude
  south: number; // Min latitude
  east: number;  // Max longitude
  west: number;  // Min longitude
  zoom: number;  // Current map zoom level
}

/**
 * Props for the GoogleMap component.
 */
interface GoogleMapProps {
  markers: MapMarker[]; // List of events to show as pins
  center?: {            // Optional override for the initial map center
    latitude: number;
    longitude: number;
  } | undefined;
  selectedMarkerId?: string | undefined; // ID of the marker that should appear highlighted or dropped
  onMarkerSelect?: ((markerId: string) => void) | undefined; // Callback when a pin is tapped
  onViewportChange?: ((bounds: ViewportBounds) => void) | undefined; // Callback when the user pans or zooms
}

// Module-level singletons to prevent multiple script injection attempts
let googleMapsPromise: Promise<void> | null = null;
let googleMapsStatus: "idle" | "loaded" | "failed" = "idle";

/**
 * Loads the Google Maps JavaScript API script dynamically.
 * Implements a singleton promise pattern to ensure the script is only injected once.
 * 
 * @param apiKey - The Google Maps API key from environment variables
 * @returns - A promise that resolves when window.google.maps is available
 */
const loadGoogleMaps = async (apiKey: string): Promise<void> => {
  // If already loaded successfully, resolve immediately
  if (googleMapsStatus === "loaded" && window.google?.maps !== undefined) {
    return;
  }

  // If a previous attempt failed, re-throw the error to inform the UI
  if (googleMapsStatus === "failed") {
    throw new Error("Google Maps authorization failed. Allow http://localhost:3000/* in the API key referrer settings.");
  }

  // If a load is already in progress, return the existing promise
  if (googleMapsPromise !== null) {
    return googleMapsPromise;
  }

  // Initialize the singleton promise
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    // Check if the script tag already exists in the DOM (e.g. from a previous component mount)
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript !== null) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), {
        once: true,
      });
      return;
    }

    // Helper to remove global callbacks after the script settles
    const cleanup = () => {
      delete window.__initGoogleMaps;
      delete window.gm_authFailure;
    };

    // Google Maps calls this function once the library is initialized
    window.__initGoogleMaps = () => {
      googleMapsStatus = "loaded";
      cleanup();
      resolve();
    };

    // Triggered if the API key fails validation (e.g. referrer mismatch)
    window.gm_authFailure = () => {
      googleMapsStatus = "failed";
      googleMapsPromise = null;
      cleanup();
      reject(
        new Error("Google Maps authorization failed. Allow http://localhost:3000/* in the API key referrer settings.")
      );
    };

    // Create and inject the async script tag
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
      "&loading=async&callback=__initGoogleMaps";
    script.async = true;
    script.defer = true;
    // Handle network-level failures (e.g. blocked script)
    script.onerror = () => {
      googleMapsStatus = "failed";
      googleMapsPromise = null;
      cleanup();
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

/**
 * GoogleMap Component
 * 
 * Manages the lifecycle of a Google Maps instance.
 * Handles marker synchronization, viewport change broadcasting, and custom night-mode styling.
 */
export default function GoogleMap({
  markers,
  center,
  selectedMarkerId,
  onMarkerSelect,
  onViewportChange,
}: GoogleMapProps) {
  // Ref for the DOM element where the map will be rendered
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Ref to hold the raw Google Map instance for imperative updates
  const mapRef = useRef<any>(null);
  // Local state to track loading or authorization errors
  const [loadError, setLoadError] = useState<string | null>(null);
  // Retrieve the public API key from Next.js environment variables
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    // Wait until the container is ready and the API key is present
    if (containerRef.current === null || apiKey === "") {
      return;
    }

    // Flag to prevent updates if the component unmounts during async loading
    let cancelled = false;

    /**
     * Internal async function to initialize and render the map.
     */
    const renderMap = async () => {
      try {
        // Load the JS SDK
        await loadGoogleMaps(apiKey);

        const googleMaps = window.google?.maps;

        // Skip if component was unmounted or SDK is missing
        if (cancelled || containerRef.current === null || googleMaps === undefined) {
          return;
        }

        // Determine starting coordinates (priority: explicit center > first marker > default Kingston)
        const defaultCenter =
          center !== undefined
            ? { lat: center.latitude, lng: center.longitude }
            : markers[0] !== undefined
              ? { lat: markers[0].latitude, lng: markers[0].longitude }
              : { lat: 18.0179, lng: -76.8099 };

        // Instantiate the Google Map with custom features disabled and dark theme styles applied
        const map = new googleMaps.Map(containerRef.current, {
          center: defaultCenter,
          zoom: markers.length > 1 ? 12 : 14,
          disableDefaultUI: true, // Remove zoom/streetview/map-type controls for a cleaner look
          // Custom night mode styling applied via the styles array
          styles: [
            {
              elementType: "geometry",
              stylers: [{ color: "#111114" }],
            },
            {
              elementType: "labels.text.fill",
              stylers: [{ color: "#a1a1aa" }],
            },
            {
              elementType: "labels.text.stroke",
              stylers: [{ color: "#111114" }],
            },
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }], // Hide points of interest to reduce visual noise
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#24242b" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#0f172a" }],
            },
          ],
        });

        // Store the instance in a ref for future access (e.g. panTo)
        mapRef.current = map;

        // Listen for the 'idle' event which fires after the map has finished panning/zooming
        map.addListener("idle", () => {
          if (cancelled || onViewportChange === undefined) return;
          // Extract current viewport coordinates to notify the parent
          const b = map.getBounds();
          if (b === undefined || b === null) return;
          const ne = b.getNorthEast();
          const sw = b.getSouthWest();
          // Broadcast the new viewport so the API can fetch relevant markers
          onViewportChange({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
            zoom: map.getZoom() ?? 12,
          });
        });

        // Initialize a LatLngBounds object to calculate the zoom level that fits all markers
        const bounds = new googleMaps.LatLngBounds();

        // Iterate over marker data to create individual pin instances
        markers.forEach((marker) => {
          const googleMarker = new googleMaps.Marker({
            map,
            position: { lat: marker.latitude, lng: marker.longitude },
            title: marker.title,
            // Apply a 'drop' animation if this marker was recently selected
            animation: selectedMarkerId === marker.id ? googleMaps.Animation.DROP : undefined,
          });

          // Handle clicks on individual pins
          googleMarker.addListener("click", () => {
            if (onMarkerSelect !== undefined) {
              onMarkerSelect(marker.id);
              return;
            }

            // Fallback navigation if no custom select handler is provided
            window.location.assign(`/event/${marker.id}`);
          });

          // Expand the map boundaries to include this marker
          bounds.extend({ lat: marker.latitude, lng: marker.longitude });
        });

        // If multiple markers exist, adjust zoom/center to fit them all comfortably
        if (markers.length > 1) {
          map.fitBounds(bounds, 48); // 48px padding around the edges
        }
      } catch (error) {
        // Capture and display API loading or authorization errors
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Map failed to load");
        }
      }
    };

    // Execute the async rendering logic
    void renderMap();

    // Cleanup: set cancelled flag to prevent callbacks from firing on unmounted component
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onViewportChange is a callback ref, its stability is handled by the parent
  }, [apiKey, center, markers, onMarkerSelect, selectedMarkerId]);

  // Render a fallback UI if the API key is missing or an error occurred during load
  if (apiKey === "" || loadError !== null) {
    return (
      <div className={styles.frame}>
        <div className={styles.fallback}>
          <p className={styles.eyebrow}>Google Maps</p>
          <p className={styles.fallbackTitle}>
            {apiKey === ""
              ? "Map preview is configured, but the API key is missing."
              : "Map preview is unavailable right now."}
          </p>
          <p className={styles.fallbackBody}>
            {apiKey === ""
              ? (
                  <>
                    Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the live map canvas.
                  </>
                )
              : loadError}
          </p>
        </div>
      </div>
    );
  }

  // Final render: the actual map canvas container
  return (
    <div className={styles.frame}>
      {/* The Google Maps SDK will inject the map tiles into this div */}
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
