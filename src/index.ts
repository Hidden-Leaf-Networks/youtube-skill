/**
 * @hidden-leaf/youtube-skill
 *
 * YouTube content extraction and intelligence skill for Claude Code.
 * Fetches transcripts, video metadata, and channel info with local caching.
 *
 * v0.5: Transcript intelligence (fetch, cache, format)
 * v1.0: Content repurposing, chapters, playlists (planned)
 */

// ============================================================================
// Client
// ============================================================================

export { YouTubeClient, createYouTubeClientFromEnv, extractVideoId } from './clients/youtube-client.js';

// ============================================================================
// Client Types
// ============================================================================

export type {
  YouTubeAuthConfig,
  YouTubeClientOptions,
  YouTubeApiResponse,
  VideoResource,
  VideoSnippet,
  VideoContentDetails,
  VideoStatistics,
  ChannelResource,
  ChannelSnippet,
  ChannelStatistics,
  SearchResult,
  SearchOptions,
  TranscriptSegment,
  TranscriptResult,
  Thumbnail,
} from './clients/types.js';

export {
  YouTubeApiRequestError,
  YouTubeAuthenticationError,
  YouTubeQuotaExceededError,
  YouTubeNotFoundError,
  YouTubeTranscriptDisabledError,
  DEFAULT_VIDEO_PARTS,
  DEFAULT_CHANNEL_PARTS,
  MAX_VIDEO_BATCH_SIZE,
} from './clients/types.js';

// ============================================================================
// Transcript Skill
// ============================================================================

export { TranscriptSkill, createTranscriptSkillFromEnv } from './skills/transcript/index.js';

// ============================================================================
// Skill Types
// ============================================================================

export type {
  FetchTranscriptOptions,
  TranscriptOutput,
  VideoMetadataOutput,
  ChannelInfoOutput,
  StatsOutput,
} from './skills/transcript/types.js';

// ============================================================================
// Cache
// ============================================================================

export { YouTubeStore, createYouTubeStoreFromEnv } from './cache/store.js';

// ============================================================================
// Utilities
// ============================================================================

export { createLogger } from './utils/logger.js';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '0.5.0';
