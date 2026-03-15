import type {
  CreateEventInput,
  EventCategory,
  RegisterInput,
  LoginInput,
  TimeSlot,
  UserInteractionType,
  Vibe,
} from "@citypulse/types";
import type {
  ApiAuthResponse,
  ApiCity,
  ApiEvent,
  ApiInteraction,
  ApiTag,
  ApiUser,
  ApiUserProfile,
} from "./api-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001/api/v1";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (
  path: string,
  query?: Record<string, string | number | undefined>
): string => {
  const url = new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`);

  if (query === undefined) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const getHeaders = (token?: string, hasJsonBody = true): HeadersInit => ({
  ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
  ...(token !== undefined && token !== "" ? { Authorization: `Bearer ${token}` } : {}),
});

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  query?: Record<string, string | number | undefined>
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    cache: "no-store",
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload =
    contentType.includes("application/json")
      ? ((await response.json()) as unknown)
      : await response.text();

  if (!response.ok) {
    const errorPayload = typeof payload === "object" && payload !== null ? payload : {};
    const message =
      typeof errorPayload === "object" &&
      errorPayload !== null &&
      "error" in errorPayload &&
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : `Request failed with status ${response.status}`;

    const details =
      typeof errorPayload === "object" && errorPayload !== null && "details" in errorPayload
        ? errorPayload.details
        : undefined;

    throw new ApiError(message, response.status, details);
  }

  return payload as T;
}

export const getCities = (): Promise<ApiCity[]> => apiFetch<ApiCity[]>("cities");

export const getTags = (): Promise<ApiTag[]> => apiFetch<ApiTag[]>("tags");

export interface GetEventsInput {
  cityId: string;
  category?: EventCategory | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  q?: string | undefined;
  north?: number | undefined;
  south?: number | undefined;
  east?: number | undefined;
  west?: number | undefined;
  zoom?: number | undefined;
}

const toQueryParams = (
  query: GetEventsInput
): Record<string, string | number | undefined> => ({
  cityId: query.cityId,
  category: query.category,
  lat: query.lat,
  lng: query.lng,
  q: query.q,
  north: query.north,
  south: query.south,
  east: query.east,
  west: query.west,
  zoom: query.zoom,
});

export const getEvents = (input: GetEventsInput): Promise<ApiEvent[]> =>
  apiFetch<ApiEvent[]>("events", undefined, toQueryParams(input));

export const getEvent = (id: string): Promise<ApiEvent> => apiFetch<ApiEvent>(`events/${id}`);

export const register = (input: RegisterInput): Promise<ApiAuthResponse> =>
  apiFetch<ApiAuthResponse>("auth/register", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(input),
  });

export const login = (input: LoginInput): Promise<ApiAuthResponse> =>
  apiFetch<ApiAuthResponse>("auth/login", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(input),
  });

export const logout = (token: string): Promise<void> =>
  apiFetch<void>("auth/logout", {
    method: "POST",
    headers: getHeaders(token, false),
  });

export const getMe = (token: string): Promise<ApiUser> =>
  apiFetch<ApiUser>("users/me", {
    headers: getHeaders(token, false),
  });

export const getMyProfile = (token: string): Promise<ApiUserProfile> =>
  apiFetch<ApiUserProfile>("/users/me/profile", {
    headers: getHeaders(token, false),
  });

export interface CreateProfileInput {
  preferredCityId: string;
  vibe: Vibe;
  timePreferences: TimeSlot[];
  interestedTags: string[];
}

export const createProfile = (
  token: string,
  input: CreateProfileInput
): Promise<ApiUserProfile> =>
  apiFetch<ApiUserProfile>("/users/me/profile", {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(input),
  });

export const createEvent = (
  token: string,
  input: CreateEventInput
): Promise<ApiEvent> =>
  apiFetch<ApiEvent>("events", {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(input),
  });

export const getMyEvents = (token: string): Promise<ApiEvent[]> =>
  apiFetch<ApiEvent[]>("users/me/events", {
    headers: getHeaders(token, false),
  });

export interface PreviewClassificationInput {
  title: string;
  description: string;
}

export interface PreviewClassificationResult {
  category: string | null;
  tags: string[];
  message?: string;
}

export const previewClassification = (
  token: string,
  input: PreviewClassificationInput
): Promise<PreviewClassificationResult> =>
  apiFetch<PreviewClassificationResult>("events/preview", {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(input),
  });

export const recordInteraction = (
  token: string,
  eventId: string,
  type: UserInteractionType
): Promise<ApiInteraction | { status: "unsaved" }> =>
  apiFetch<ApiInteraction | { status: "unsaved" }>("interactions", {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ eventId, type }),
  });
