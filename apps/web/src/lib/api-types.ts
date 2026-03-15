import type {
  EventCategory,
  EventStatus,
  TimeSlot,
  UserInteractionType,
  Vibe,
} from "@citypulse/types";

export interface ApiCity {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  createdAt: string;
}

export interface ApiTag {
  id: string;
  name: string;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUserProfile {
  id: string;
  userId: string;
  preferredCityId: string;
  interestedTags: string[];
  vibe: Vibe;
  timePreferences: TimeSlot[];
  updatedAt: string;
}

export interface ApiEvent {
  id: string;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  h3R7: string;
  h3R9: string;
  h3R11: string;
  category: EventCategory | null;
  tags: ApiTag[];
  eventDate: string;
  startTime: string;
  endTime: string | null;
  status: EventStatus;
  cityId: string;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  city?: ApiCity;
  submittedBy?: Pick<ApiUser, "id" | "name">;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiInteraction {
  id: string;
  userId: string;
  eventId: string;
  type: UserInteractionType;
  createdAt: string;
}

export interface ApiAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: number;
  createdAt: string;
  active: boolean;
}
