# @hidden-leaf/youtube-skill — Claude Code Skill Reference

> **When to use this skill:** When the user mentions YouTube, video transcript, video summary, YouTube content, or wants to extract information from a YouTube video.

## Architecture

**Fetch + Cache pattern:** All data is fetched from YouTube once and cached locally in SQLite. Subsequent reads are free and instant.

- **Transcripts** are extracted via InnerTube (no API key needed, no quota cost)
- **Video/channel metadata** uses YouTube Data API v3 (requires API key, costs quota)

## Setup

### Required Environment Variables
```bash
YOUTUBE_API_KEY=your-api-key    # For video/channel metadata (not transcripts)
```

### Optional
```bash
YOUTUBE_CACHE_DB_PATH=          # Default: ~/.youtube-skill/youtube.db
YOUTUBE_MAX_RETRIES=3           # Retries on 5xx/network errors
YOUTUBE_TIMEOUT=30000           # Request timeout in ms
LOG_LEVEL=info                  # debug, info, warn, error
```

## API Reference

### TranscriptSkill

The primary skill class. Factory: `createTranscriptSkillFromEnv()`

```typescript
import { createTranscriptSkillFromEnv } from '@hidden-leaf/youtube-skill';
const skill = createTranscriptSkillFromEnv();
```

#### Methods

**`fetchTranscript(urlOrId, options?)`** — Fetch video metadata + transcript, cache both
```typescript
const result = await skill.fetchTranscript('https://youtube.com/watch?v=dQw4w9WgXcQ');
// result.video — VideoResource (title, description, stats, etc.)
// result.transcript — TranscriptResult (segments with timestamps)
// result.formatted — Full text as a single string
// result.fromCache — Whether this came from cache
```

Options: `{ lang?: string, refresh?: boolean, includeTimestamps?: boolean }`

**`fetchVideoMetadata(urlOrId)`** — Fetch video metadata only (no transcript)
```typescript
const result = await skill.fetchVideoMetadata('VIDEO_ID');
// result.video — VideoResource
```

**`fetchChannelInfo(channelId)`** — Fetch channel metadata
```typescript
const result = await skill.fetchChannelInfo('UC...');
// result.channel — ChannelResource
```

**`getTranscript(videoId, lang?)`** — Read transcript from cache (free, instant)

**`getVideo(videoId)`** — Read video metadata from cache

**`stats()`** — Cache statistics (video count, transcript count, etc.)

### YouTubeClient

Low-level API client. Factory: `createYouTubeClientFromEnv()`

```typescript
import { createYouTubeClientFromEnv } from '@hidden-leaf/youtube-skill';
const client = createYouTubeClientFromEnv();

const video = await client.getVideo('VIDEO_ID');
const videos = await client.getVideos(['ID1', 'ID2']); // batch up to 50
const channel = await client.getChannel('CHANNEL_ID');
const transcript = await client.getTranscript('VIDEO_ID', 'en');
```

### Utility

**`extractVideoId(urlOrId)`** — Parse any YouTube URL format to video ID
```typescript
import { extractVideoId } from '@hidden-leaf/youtube-skill';
extractVideoId('https://youtube.com/watch?v=abc123');  // 'abc123'
extractVideoId('https://youtu.be/abc123');              // 'abc123'
extractVideoId('abc123');                                // 'abc123'
```

## Error Handling

| Error Class | When | HTTP Status |
|---|---|---|
| `YouTubeApiRequestError` | Generic API error | varies |
| `YouTubeAuthenticationError` | Invalid/missing API key | 401, 403 |
| `YouTubeQuotaExceededError` | Daily quota exceeded | 403 |
| `YouTubeNotFoundError` | Video/channel not found | 404 |
| `YouTubeTranscriptDisabledError` | Transcripts disabled on video | N/A |

## Cost Notes

- **Transcript extraction:** FREE (uses InnerTube, no API key needed)
- **Video metadata (list):** 1 unit per call (batch up to 50 IDs)
- **Channel metadata:** 1 unit per call
- **Search:** 100 units per call
- **Daily free quota:** 10,000 units
- **Cache reads:** Always free (SQLite)
