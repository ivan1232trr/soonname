"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./GoogleMap.module.css";

declare global {
  interface Window {
    google?: {
      maps?: any;
    };
    gm_authFailure?: () => void;
    __initGoogleMaps?: () => void;
  }
}

interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

interface GoogleMapProps {
  markers: MapMarker[];
  center?: {
    latitude: number;
    longitude: number;
  } | undefined;
  selectedMarkerId?: string | undefined;
  onMarkerSelect?: ((markerId: string) => void) | undefined;
  onViewportChange?: ((bounds: ViewportBounds) => void) | undefined;
}

let googleMapsPromise: Promise<void> | null = null;
let googleMapsStatus: "idle" | "loaded" | "failed" = "idle";

const loadGoogleMaps = async (apiKey: string): Promise<void> => {
  if (googleMapsStatus === "loaded" && window.google?.maps !== undefined) {
    return;
  }

  if (googleMapsStatus === "failed") {
    throw new Error("Google Maps authorization failed. Allow http://localhost:3000/* in the API key referrer settings.");
  }

  if (googleMapsPromise !== null) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript !== null) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), {
        once: true,
      });
      return;
    }

    const cleanup = () => {
      delete window.__initGoogleMaps;
      delete window.gm_authFailure;
    };

    window.__initGoogleMaps = () => {
      googleMapsStatus = "loaded";
      cleanup();
      resolve();
    };

    window.gm_authFailure = () => {
      googleMapsStatus = "failed";
      googleMapsPromise = null;
      cleanup();
      reject(
        new Error("Google Maps authorization failed. Allow http://localhost:3000/* in the API key referrer settings.")
      );
    };

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
      "&loading=async&callback=__initGoogleMaps";
    script.async = true;
    script.defer = true;
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

export default function GoogleMap({
  markers,
  center,
  selectedMarkerId,
  onMarkerSelect,
  onViewportChange,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    if (containerRef.current === null || apiKey === "") {
      return;
    }

    let cancelled = false;

    const renderMap = async () => {
      try {
        await loadGoogleMaps(apiKey);

        const googleMaps = window.google?.maps;

        if (cancelled || containerRef.current === null || googleMaps === undefined) {
          return;
        }

        const defaultCenter =
          center !== undefined
            ? { lat: center.latitude, lng: center.longitude }
            : markers[0] !== undefined
              ? { lat: markers[0].latitude, lng: markers[0].longitude }
              : { lat: 18.0179, lng: -76.8099 };

        const map = new googleMaps.Map(containerRef.current, {
          center: defaultCenter,
          zoom: markers.length > 1 ? 12 : 14,
          disableDefaultUI: true,
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
          ],
        });

        mapRef.current = map;

        // Fire viewport change after every pan/zoom settles
        map.addListener("idle", () => {
          if (cancelled || onViewportChange === undefined) return;
          const b = map.getBounds();
          if (b === undefined || b === null) return;
          const ne = b.getNorthEast();
          const sw = b.getSouthWest();
          onViewportChange({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
            zoom: map.getZoom() ?? 12,
          });
        });

        const bounds = new googleMaps.LatLngBounds();

        markers.forEach((marker) => {
          const googleMarker = new googleMaps.Marker({
            map,
            position: { lat: marker.latitude, lng: marker.longitude },
            title: marker.title,
            animation: selectedMarkerId === marker.id ? googleMaps.Animation.DROP : undefined,
          });

          googleMarker.addListener("click", () => {
            if (onMarkerSelect !== undefined) {
              onMarkerSelect(marker.id);
              return;
            }

            window.location.assign(`/event/${marker.id}`);
          });

          bounds.extend({ lat: marker.latitude, lng: marker.longitude });
        });

        if (markers.length > 1) {
          map.fitBounds(bounds, 48);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Map failed to load");
        }
      }
    };

    void renderMap();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onViewportChange is a callback ref, not a dep
  }, [apiKey, center, markers, onMarkerSelect, selectedMarkerId]);

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

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
