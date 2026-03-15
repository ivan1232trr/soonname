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

interface MarkerInstance {
  marker: any;
  clickListener: { remove?: () => void } | null;
  pin: any | null;
}

let googleMapsPromise: Promise<void> | null = null;
let googleMapsStatus: "idle" | "loading" | "loaded" | "failed" = "idle";
let googleMapsFailureMessage: string | null = null;

const DEFAULT_MARKER_STYLE = {
  background: "#650386",
  borderColor: "#f5d0fe",
  glyphColor: "#ffffff",
  scale: 1,
} as const;

const SELECTED_MARKER_STYLE = {
  background: "#f59e0b",
  borderColor: "#fef3c7",
  glyphColor: "#111827",
  scale: 1.18,
} as const;

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

const markGoogleMapsAsFailed = (message: string): void => {
  googleMapsStatus = "failed";
  googleMapsFailureMessage = message;
  googleMapsPromise = null;
};

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

const clearMarkers = (markers: Map<string, MarkerInstance>): void => {
  markers.forEach(({ marker, clickListener }) => {
    clickListener?.remove?.();
    if ("map" in marker) {
      marker.map = null;
      return;
    }

    marker.setMap?.(null);
  });
  markers.clear();
};

const applyMarkerState = (markerInstance: MarkerInstance, isSelected: boolean): void => {
  const markerStyle = isSelected ? SELECTED_MARKER_STYLE : DEFAULT_MARKER_STYLE;

  if (markerInstance.pin !== null) {
    markerInstance.pin.background = markerStyle.background;
    markerInstance.pin.borderColor = markerStyle.borderColor;
    markerInstance.pin.glyphColor = markerStyle.glyphColor;
    markerInstance.pin.scale = markerStyle.scale;
  }

  markerInstance.marker.zIndex = isSelected ? 1000 : 1;
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
      markGoogleMapsAsFailed(message);
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
      "&loading=async&libraries=marker&v=weekly&callback=__initGoogleMaps";
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
  const markerInstancesRef = useRef<Map<string, MarkerInstance>>(new Map());
  const idleListenerRef = useRef<{ remove?: () => void } | null>(null);
  const viewportChangeRef = useRef(onViewportChange);
  const markerSelectRef = useRef(onMarkerSelect);
  const lastSelectedMarkerIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

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

        const markerLibrary = googleMaps.marker;
        if (markerLibrary?.AdvancedMarkerElement === undefined || markerLibrary.PinElement === undefined) {
          throw new Error(
            "Google Maps marker library is unavailable. Set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID or retry loading the map."
          );
        }

        const map = new googleMaps.Map(container, {
          center: getDefaultCenter(center, markers),
          zoom: markers.length > 1 ? 12 : 14,
          disableDefaultUI: true,
          mapId,
          styles: MAP_STYLES,
        });

        mapRef.current = map;
        setIsMapReady(true);

        idleListenerRef.current = map.addListener("idle", () => {
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

          const failureMessage = buildGoogleMapsSetupMessage(
            "Google Maps rejected the current API key or project configuration."
          );
          markGoogleMapsAsFailed(failureMessage);
          idleListenerRef.current?.remove?.();
          idleListenerRef.current = null;
          clearMarkers(markerInstancesRef.current);
          mapRef.current = null;
          lastSelectedMarkerIdRef.current = null;
          setIsMapReady(false);
          setLoadError(failureMessage);
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

      idleListenerRef.current?.remove?.();
      idleListenerRef.current = null;
      clearMarkers(markerInstancesRef.current);
      mapRef.current = null;
      lastSelectedMarkerIdRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is initialized once; later prop changes are handled by dedicated effects
  }, [apiKey, mapId]);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    const map = mapRef.current;
    if (!isMapReady || loadError !== null || googleMaps === undefined || map === null) {
      return;
    }

    clearMarkers(markerInstancesRef.current);
    lastSelectedMarkerIdRef.current = null;

    const bounds = new googleMaps.LatLngBounds();

    const markerLibrary = googleMaps.marker;
    if (markerLibrary?.AdvancedMarkerElement === undefined || markerLibrary.PinElement === undefined) {
      setLoadError("Google Maps marker library is unavailable right now.");
      return;
    }

    markers.forEach((marker) => {
      const pin = new markerLibrary.PinElement({
        background: DEFAULT_MARKER_STYLE.background,
        borderColor: DEFAULT_MARKER_STYLE.borderColor,
        glyphColor: DEFAULT_MARKER_STYLE.glyphColor,
        scale: DEFAULT_MARKER_STYLE.scale,
      });

      const googleMarker = new markerLibrary.AdvancedMarkerElement({
        map,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.title,
        gmpClickable: true,
      });
      googleMarker.append(pin);

      const clickListener = googleMarker.addListener("click", () => {
        const handleMarkerSelect = markerSelectRef.current;
        if (handleMarkerSelect !== undefined) {
          handleMarkerSelect(marker.id);
          return;
        }

        window.location.assign(`/event/${marker.id}`);
      });

      bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      const markerInstance = { marker: googleMarker, clickListener, pin };
      applyMarkerState(markerInstance, marker.id === selectedMarkerId);
      markerInstancesRef.current.set(marker.id, markerInstance);
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
    if (!isMapReady) {
      return;
    }

    const previousMarkerId = lastSelectedMarkerIdRef.current;
    if (previousMarkerId !== null) {
      const previousMarker = markerInstancesRef.current.get(previousMarkerId);
      if (previousMarker !== undefined) {
        applyMarkerState(previousMarker, false);
      }
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

    applyMarkerState(selectedMarker, true);
    lastSelectedMarkerIdRef.current = selectedMarkerId;
  }, [isMapReady, markers, selectedMarkerId]);

  const showFallback = apiKey === "" || loadError !== null;

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.canvas} aria-hidden={showFallback} />
      {showFallback ? (
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
      ) : null}
    </div>
  );
}
