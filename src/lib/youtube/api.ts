/**
 * YouTube Data API v3 wrapper.
 * Only used for operations that can't be done via RSS feeds.
 *
 * Quota costs:
 * - playlistItems.insert: 50 units
 * - playlistItems.list: 1 unit
 * - playlists.list: 1 unit
 * - search.list: 100 units (use sparingly!)
 * - videos.list: 1 unit
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  itemCount: number;
}

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

/**
 * Add a video to a YouTube playlist.
 * Cost: 50 quota units.
 */
export async function addVideoToPlaylist(
  accessToken: string,
  playlistId: string,
  videoId: string
): Promise<void> {
  const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to add video ${videoId} to playlist ${playlistId}: ${error}`);
  }
}

/**
 * List the authenticated user's playlists.
 * Cost: 1 quota unit per page.
 */
export async function getUserPlaylists(
  accessToken: string
): Promise<YouTubePlaylist[]> {
  const playlists: YouTubePlaylist[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      mine: "true",
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch playlists: ${await res.text()}`);
    }

    const data = await res.json();

    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description || "",
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
        itemCount: item.contentDetails?.itemCount || 0,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

/**
 * Search YouTube for videos.
 * Cost: 100 quota units per call (capped at 100 calls/day).
 * Use only for manual search, never in the cron job.
 */
export async function searchVideos(
  accessToken: string,
  query: string,
  channelId?: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(maxResults),
    order: "relevance",
    ...(channelId ? { channelId } : {}),
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`YouTube search failed: ${await res.text()}`);
  }

  const data = await res.json();

  return (data.items || []).map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
        channelTitle: string;
        publishedAt: string;
      };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    })
  );
}

/**
 * Resolve a YouTube channel URL/handle to a Channel ID.
 * Supports formats:
 * - https://www.youtube.com/@handle
 * - https://www.youtube.com/channel/UCxxxx
 * - https://www.youtube.com/c/ChannelName
 * - Direct channel ID (UC...)
 */
export async function resolveChannelId(
  accessToken: string,
  input: string
): Promise<{ channelId: string; channelName: string; thumbnail: string } | null> {
  const trimmed = input.trim();

  // Direct channel ID
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return fetchChannelInfo(accessToken, trimmed);
  }

  // Extract from URL
  const channelIdMatch = trimmed.match(
    /youtube\.com\/channel\/(UC[\w-]{22})/
  );
  if (channelIdMatch) {
    return fetchChannelInfo(accessToken, channelIdMatch[1]);
  }

  // Handle (@username) or custom URL (/c/name)
  const handleMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  const customMatch = trimmed.match(/youtube\.com\/c\/([\w.-]+)/);
  const searchTerm = handleMatch?.[1] || customMatch?.[1];

  if (searchTerm) {
    // Use channels.list with forHandle (1 quota unit)
    const params = new URLSearchParams({
      part: "snippet",
      forHandle: searchTerm,
    });

    const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to resolve channel handle: ${await res.text()}`);
    }

    const data = await res.json();
    const channel = data.items?.[0];

    if (!channel) return null;

    return {
      channelId: channel.id,
      channelName: channel.snippet.title,
      thumbnail:
        channel.snippet.thumbnails?.medium?.url ||
        channel.snippet.thumbnails?.default?.url ||
        "",
    };
  }

  // If none of the above, try treating it as a handle directly
  if (!trimmed.includes("/")) {
    const params = new URLSearchParams({
      part: "snippet",
      forHandle: trimmed.replace("@", ""),
    });

    const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const channel = data.items?.[0];
      if (channel) {
        return {
          channelId: channel.id,
          channelName: channel.snippet.title,
          thumbnail:
            channel.snippet.thumbnails?.medium?.url ||
            channel.snippet.thumbnails?.default?.url ||
            "",
        };
      }
    }
  }

  return null;
}

async function fetchChannelInfo(
  accessToken: string,
  channelId: string
): Promise<{ channelId: string; channelName: string; thumbnail: string } | null> {
  const params = new URLSearchParams({
    part: "snippet",
    id: channelId,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const channel = data.items?.[0];

  if (!channel) return null;

  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    thumbnail:
      channel.snippet.thumbnails?.medium?.url ||
      channel.snippet.thumbnails?.default?.url ||
      "",
  };
}
