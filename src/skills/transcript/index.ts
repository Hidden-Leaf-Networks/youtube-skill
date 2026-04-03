import { YouTubeClient, createYouTubeClientFromEnv, extractVideoId } from '../../clients/youtube-client.js';
import { YouTubeStore, createYouTubeStoreFromEnv } from '../../cache/store.js';
import { TranscriptResult } from '../../clients/types.js';
import {
  FetchTranscriptOptions,
  TranscriptOutput,
  VideoMetadataOutput,
  ChannelInfoOutput,
  StatsOutput,
} from './types.js';

// ============================================================================
// Transcript Skill
// ============================================================================

export class TranscriptSkill {
  private client: YouTubeClient;
  private store: YouTubeStore;

  constructor(client: YouTubeClient, store?: YouTubeStore) {
    this.client = client;
    this.store = store ?? createYouTubeStoreFromEnv();
  }

  // --------------------------------------------------------------------------
  // Fetch + Cache
  // --------------------------------------------------------------------------

  /**
   * Fetch video metadata and transcript, caching both.
   * Returns from cache if available (unless refresh=true).
   */
  async fetchTranscript(urlOrId: string, options?: FetchTranscriptOptions): Promise<TranscriptOutput> {
    const videoId = extractVideoId(urlOrId);
    const lang = options?.lang ?? 'en';

    // Check cache first
    if (!options?.refresh) {
      const cachedVideo = this.store.getVideo(videoId);
      const cachedTranscript = this.store.getTranscript(videoId, lang);
      if (cachedVideo && cachedTranscript) {
        return {
          video: cachedVideo,
          transcript: cachedTranscript,
          formatted: this.formatTranscript(cachedTranscript, options?.includeTimestamps),
          fromCache: true,
        };
      }
    }

    // Fetch from APIs
    const video = await this.client.getVideo(videoId);
    this.store.upsertVideo(video);

    const transcript = await this.client.getTranscript(videoId, lang);
    this.store.upsertTranscript(videoId, transcript);

    return {
      video,
      transcript,
      formatted: this.formatTranscript(transcript, options?.includeTimestamps),
      fromCache: false,
    };
  }

  /**
   * Fetch video metadata only (no transcript). Caches the result.
   */
  async fetchVideoMetadata(urlOrId: string): Promise<VideoMetadataOutput> {
    const videoId = extractVideoId(urlOrId);

    const cached = this.store.getVideo(videoId);
    if (cached) {
      return { video: cached, fromCache: true };
    }

    const video = await this.client.getVideo(videoId);
    this.store.upsertVideo(video);
    return { video, fromCache: false };
  }

  /**
   * Fetch channel metadata. Caches the result.
   */
  async fetchChannelInfo(channelId: string): Promise<ChannelInfoOutput> {
    const cached = this.store.getChannel(channelId);
    if (cached) {
      return { channel: cached, fromCache: true };
    }

    const channel = await this.client.getChannel(channelId);
    this.store.upsertChannel(channel);
    return { channel, fromCache: false };
  }

  // --------------------------------------------------------------------------
  // Cache Reads (free, instant)
  // --------------------------------------------------------------------------

  getTranscript(videoId: string, lang?: string): TranscriptResult | undefined {
    return this.store.getTranscript(videoId, lang);
  }

  getVideo(videoId: string) {
    return this.store.getVideo(videoId);
  }

  stats(): StatsOutput {
    return this.store.getStats();
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  close(): void {
    this.store.close();
  }

  // --------------------------------------------------------------------------
  // Formatting
  // --------------------------------------------------------------------------

  private formatTranscript(transcript: TranscriptResult, includeTimestamps?: boolean): string {
    if (!includeTimestamps) {
      return transcript.fullText;
    }

    return transcript.segments
      .map((seg) => {
        const minutes = Math.floor(seg.offset / 60_000);
        const seconds = Math.floor((seg.offset % 60_000) / 1_000);
        const timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        return `[${timestamp}] ${seg.text}`;
      })
      .join('\n');
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createTranscriptSkillFromEnv(): TranscriptSkill {
  const client = createYouTubeClientFromEnv();
  const store = createYouTubeStoreFromEnv();
  return new TranscriptSkill(client, store);
}
