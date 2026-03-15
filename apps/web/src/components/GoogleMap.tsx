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

let googleMapsPromise: Promise<void> | null = null;
let googleMapsStatus: "idle" | "loading" | "loaded" | "failed" = "idle";
let googleMapsFailureMessage: string | null = null;

const MAP_STYLES = [
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
    stylers: [{ visibility: "off" }],
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
];

const getReferrerHint = (): string => {
  if (typeof window === "undefined") {
    return "allow this site's domain in the API key HTTP referrer restrictions.";
  }

  return `allow ${window.location.origin}/* in the API key HTTP referrer restrictions.`;
};

const buildGoogleMapsSetupMessage = (reason: string): string =>
  `${reason} Enable the Maps JavaScript API and billing for this Google Cloud project, and ${getReferrerHint()}`;

const getDefaultCenter = (
  center: GoogleMapProps["center"],
  markers: MapMarker[]
): { lat: number; lng: number } => {
  if (center !== undefined) {
    return { lat: center.latitude, lng: center.longitude };
  }

  if (markers[0] !== undefined) {
    return { lat: markers[0].latitude, lng: markers[0].longitude };
  }

  return { lat: 18.0179, lng: -76.8099 };
};

const clearMarkers = (googleMaps: any, markers: Map<string, any>): void => {
  markers.forEach((marker) => {
    googleMaps?.event?.clearInstanceListeners?.(marker);
    marker.setMap(null);
  });
  markers.clear();
};

const destroyMap = (
  googleMaps: any,
  container: HTMLDivElement | null,
  map: any,
  markers: Map<string, any>
): void => {
  clearMarkers(googleMaps, markers);
  googleMaps?.event?.clearInstanceListeners?.(map);

  if (container !== null) {
    container.innerHTML = "";
  }
};

const loadGoogleMaps = async (apiKey: string): Promise<void> => {
  if (googleMapsStatus === "loaded" && window.google?.maps !== undefined) {
    return;
  }

  if (googleMapsStatus === "failed") {
    throw new Error(
      googleMapsFailureMessage ?? buildGoogleMapsSetupMessage("Google Maps failed to load.")
    );
  }

  if (googleMapsPromise !== null) {
    return googleMapsPromise;
  }

  googleMapsStatus = "loading";
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      delete window.__initGoogleMaps;
      delete window.gm_authFailure;
    };

    const fail = (message: string) => {
      googleMapsStatus = "failed";
      googleMapsFailureMessage = message;
      googleMapsPromise = null;
      cleanup();
      reject(new Error(message));
    };

    window.__initGoogleMaps = () => {
      googleMapsStatus = "loaded";
      googleMapsFailureMessage = null;
      cleanup();
      resolve();
    };

    window.gm_authFailure = () => {
      fail(buildGoogleMapsSetupMessage("Google Maps rejected the configured API key."));
    };

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript !== null) {
      if (window.google?.maps !== undefined) {
        googleMapsStatus = "loaded";
        googleMapsFailureMessage = null;
        cleanup();
        resolve();
        return;
      }

      existingScript.addEventListener(
        "error",
        () => {
          fail(buildGoogleMapsSetupMessage("Google Maps could not be loaded."));
        },
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
      "&loading=async&callback=__initGoogleMaps";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      fail(buildGoogleMapsSetupMessage("Google Maps could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

export default function GoogleMap({
  markers,
  center,
  selectedMarkerId,
  onMarkerSelect,
  onViewportChange,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerInstancesRef = useRef<Map<string, any>>(new Map());
  const viewportChangeRef = useRef(onViewportChange);
  const markerSelectRef = useRef(onMarkerSelect);
  const lastSelectedMarkerIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    viewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    markerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    if (containerRef.current === null || apiKey === "" || mapRef.current !== null) {
      return;
    }

    let cancelled = false;
    let setupProbeTimer: number | null = null;

    const initializeMap = async () => {
      try {
        await loadGoogleMaps(apiKey);

        const googleMaps = window.google?.maps;
        const container = containerRef.current;
        if (cancelled || container === null || googleMaps === undefined) {
          return;
        }

        const map = new googleMaps.Map(container, {
          center: getDefaultCenter(center, markers),
          zoom: markers.length > 1 ? 12 : 14,
          disableDefaultUI: true,
          styles: MAP_STYLES,
        });

        mapRef.current = map;
        setIsMapReady(true);

        map.addListener("idle", () => {
          const handleViewportChange = viewportChangeRef.current;
          if (cancelled || handleViewportChange === undefined) {
            return;
          }

          const b = map.getBounds();
          if (b === undefined || b === null) {
            return;
          }

          const ne = b.getNorthEast();
          const sw = b.getSouthWest();

          handleViewportChange({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
            zoom: map.getZoom() ?? 12,
          });
        });

        setupProbeTimer = window.setTimeout(() => {
          if (cancelled || containerRef.current === null) {
            return;
          }

          if (containerRef.current.querySelector(".gm-err-container") === null) {
            return;
          }

          destroyMap(googleMaps, containerRef.current, mapRef.current, markerInstancesRef.current);
          mapRef.current = null;
          lastSelectedMarkerIdRef.current = null;
          setIsMapReady(false);
          setLoadError(
            buildGoogleMapsSetupMessage("Google Maps rejected the current API key or project configuration.")
          );
        }, 1500);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Map failed to load");
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      if (setupProbeTimer !== null) {
        window.clearTimeout(setupProbeTimer);
      }

      const googleMaps = window.google?.maps;
      destroyMap(googleMaps, containerRef.current, mapRef.current, markerInstancesRef.current);
      mapRef.current = null;
      lastSelectedMarkerIdRef.current = null;
      setIsMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is initialized once; later prop changes are handled by dedicated effects
  }, [apiKey]);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    const map = mapRef.current;
    if (!isMapReady || loadError !== null || googleMaps === undefined || map === null) {
      return;
    }

    clearMarkers(googleMaps, markerInstancesRef.current);
    lastSelectedMarkerIdRef.current = null;

    const bounds = new googleMaps.LatLngBounds();

    markers.forEach((marker) => {
      const googleMarker = new googleMaps.Marker({
        map,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.title,
      });

      googleMarker.addListener("click", () => {
        const handleMarkerSelect = markerSelectRef.current;
        if (handleMarkerSelect !== undefined) {
          handleMarkerSelect(marker.id);
          return;
        }

        window.location.assign(`/event/${marker.id}`);
      });

      bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      markerInstancesRef.current.set(marker.id, googleMarker);
    });

    if (markers.length > 1) {
      map.fitBounds(bounds, 48);
      return;
    }

    const firstMarker = markers[0];
    if (firstMarker !== undefined && markers.length === 1) {
      map.setCenter({ lat: firstMarker.latitude, lng: firstMarker.longitude });
      if ((map.getZoom?.() ?? 0) < 14) {
        map.setZoom(14);
      }
      return;
    }

    map.setCenter(getDefaultCenter(center, markers));
  }, [center, isMapReady, loadError, markers]);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    if (!isMapReady || googleMaps === undefined) {
      return;
    }

    const previousMarkerId = lastSelectedMarkerIdRef.current;
    if (previousMarkerId !== null) {
      markerInstancesRef.current.get(previousMarkerId)?.setAnimation(null);
    }

    if (selectedMarkerId === undefined) {
      lastSelectedMarkerIdRef.current = null;
      return;
    }

    const selectedMarker = markerInstancesRef.current.get(selectedMarkerId);
    if (selectedMarker === undefined) {
      lastSelectedMarkerIdRef.current = null;
      return;
    }

    selectedMarker.setAnimation(googleMaps.Animation.DROP);
    lastSelectedMarkerIdRef.current = selectedMarkerId;
  }, [isMapReady, markers, selectedMarkerId]);

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
                    Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> and enable the Maps JavaScript API
                    for that key&apos;s Google Cloud project.
                  </>
                )
              : loadError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
