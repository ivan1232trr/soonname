import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { EventCategory, EventStatus } from "@prisma/client";
import { config } from "../config.js";

export interface SpatialIndexEventDocument {
  id: string;
  cityId: string;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  h3R7: string;
  h3R9: string;
  h3R11: string;
  category: EventCategory | null;
  status: EventStatus;
  tags: string[];
  eventDate: Date;
  startTime: Date;
  endTime: Date | null;
  updatedAt: Date;
}

const s3Client = config.s3.enabled
  ? new S3Client({
      region: config.s3.region,
      ...(config.s3.endpoint !== "" ? { endpoint: config.s3.endpoint } : {}),
      ...(config.s3.accessKeyId !== "" && config.s3.secretAccessKey !== ""
        ? {
            credentials: {
              accessKeyId: config.s3.accessKeyId,
              secretAccessKey: config.s3.secretAccessKey,
            },
          }
        : {}),
      ...(config.s3.forcePathStyle ? { forcePathStyle: true } : {}),
    })
  : null;

const buildSpatialIndexKey = (event: SpatialIndexEventDocument): string => {
  const prefix = config.s3.indexPrefix.replace(/^\/+|\/+$/g, "");
  const base = [
    prefix,
    config.nodeEnv,
    "cities",
    event.cityId,
    "h3",
    `r7=${event.h3R7}`,
    `r9=${event.h3R9}`,
    `event=${event.id}.json`,
  ].filter(Boolean);

  return base.join("/");
};

export const publishSpatialIndexDocument = async (
  event: SpatialIndexEventDocument
): Promise<void> => {
  if (s3Client === null) {
    return;
  }

  const key = buildSpatialIndexKey(event);
  const body = JSON.stringify(
    {
      ...event,
      eventDate: event.eventDate.toISOString(),
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString() ?? null,
      updatedAt: event.updatedAt.toISOString(),
    },
    null,
    2
  );

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      Metadata: {
        cityid: event.cityId,
        h3r7: event.h3R7,
        h3r9: event.h3R9,
        h3r11: event.h3R11,
        status: event.status,
      },
    })
  );
};
