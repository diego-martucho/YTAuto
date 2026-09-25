import { XMLParser } from "fast-xml-parser";

export interface RSSVideo {
  videoId: string;
  title: string;
  publishedAt: Date;
  url: string;
  description: string;
  channelId: string;
  channelName: string;
}

interface YouTubeFeedEntry {
  "yt:videoId": string;
  "yt:channelId": string;
  title: string;
  published: string;
  author?: { name?: string };
  link?: { "@_href": string } | Array<{ "@_href": string }>;
  "media:group"?: {
    "media:description"?: string;
  };
}

/**
 * Fetch the latest videos from a YouTube channel via RSS feed.
 * This costs 0 YouTube API quota units.
 *
 * @returns Up to 15 most recent videos from the channel
 */
export async function getLatestChannelVideos(
  channelId: string
): Promise<RSSVideo[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "YTAuto/1.0",
    },
    next: { revalidate: 900 }, // Cache for 15 minutes in Next.js
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch RSS feed for channel ${channelId}: ${res.status} ${res.statusText}`
    );
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const data = parser.parse(xml);

  const entries: YouTubeFeedEntry[] = Array.isArray(data.feed?.entry)
    ? data.feed.entry
    : data.feed?.entry
      ? [data.feed.entry]
      : [];

  return entries.map((entry) => {
    const link = Array.isArray(entry.link)
      ? entry.link[0]?.["@_href"]
      : entry.link?.["@_href"];

    return {
      videoId: entry["yt:videoId"],
      title: typeof entry.title === "string" ? entry.title : String(entry.title),
      publishedAt: new Date(entry.published),
      url: link || `https://www.youtube.com/watch?v=${entry["yt:videoId"]}`,
      description: entry["media:group"]?.["media:description"] || "",
      channelId: entry["yt:channelId"],
      channelName: entry.author?.name || "",
    };
  });
}

/**
 * Filter videos published within a time window (e.g., last 24 hours).
 */
export function filterVideosByTimeWindow(
  videos: RSSVideo[],
  windowStart: Date,
  windowEnd: Date
): RSSVideo[] {
  return videos.filter(
    (video) =>
      video.publishedAt >= windowStart && video.publishedAt <= windowEnd
  );
}
