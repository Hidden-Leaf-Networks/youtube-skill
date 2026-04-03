import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { YoutubeTranscript } from 'youtube-transcript';
import {
  YouTubeAuthConfig,
  YouTubeClientOptions,
  YouTubeApiResponse,
  VideoResource,
  ChannelResource,
  SearchResult,
  SearchOptions,
  TranscriptResult,
  TranscriptSegment,
  YouTubeApiRequestError,
  YouTubeAuthenticationError,
  YouTubeQuotaExceededError,
  YouTubeNotFoundError,
  YouTubeTranscriptDisabledError,
  DEFAULT_VIDEO_PARTS,
  DEFAULT_CHANNEL_PARTS,
  MAX_VIDEO_BATCH_SIZE,
} from './types.js';

// ============================================================================
// YouTube URL Parsing
// ============================================================================

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
];

/**
 * Extract a YouTube video ID from any URL format or bare ID.
 */
export function extractVideoId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  throw new YouTubeApiRequestError(`Could not extract video ID from: ${urlOrId}`, 400, 'INVALID_URL');
}

// ============================================================================
// Client
// ============================================================================

export class YouTubeClient {
  private http: AxiosInstance;
  private apiKey: string;

  constructor(auth: YouTubeAuthConfig, options?: YouTubeClientOptions) {
    this.apiKey = auth.apiKey;

    this.http = axios.create({
      baseURL: 'https://www.googleapis.com/youtube/v3',
      timeout: options?.timeout ?? 30_000,
      headers: { 'Accept': 'application/json' },
    });

    axiosRetry(this.http, {
      retries: options?.maxRetries ?? 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined && error.response.status >= 500),
    });

    // Error interceptor
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) throw error;
        const { status, data } = error.response;
        const apiError = data?.error;
        const message = apiError?.message ?? error.message;

        if (status === 403 && apiError?.errors?.some((e: { reason: string }) => e.reason === 'quotaExceeded')) {
          throw new YouTubeQuotaExceededError();
        }
        if (status === 401 || status === 403) {
          throw new YouTubeAuthenticationError(message, status);
        }
        if (status === 404) {
          throw new YouTubeNotFoundError(message);
        }
        throw new YouTubeApiRequestError(message, status, apiError?.code);
      },
    );
  }

  // --------------------------------------------------------------------------
  // Video
  // --------------------------------------------------------------------------

  async getVideo(videoId: string): Promise<VideoResource> {
    const response = await this.http.get<YouTubeApiResponse<VideoResource>>('/videos', {
      params: { key: this.apiKey, part: DEFAULT_VIDEO_PARTS, id: videoId },
    });
    if (!response.data.items.length) {
      throw new YouTubeNotFoundError(`Video not found: ${videoId}`);
    }
    return response.data.items[0];
  }

  async getVideos(videoIds: string[]): Promise<VideoResource[]> {
    const results: VideoResource[] = [];
    for (let i = 0; i < videoIds.length; i += MAX_VIDEO_BATCH_SIZE) {
      const batch = videoIds.slice(i, i + MAX_VIDEO_BATCH_SIZE);
      const response = await this.http.get<YouTubeApiResponse<VideoResource>>('/videos', {
        params: { key: this.apiKey, part: DEFAULT_VIDEO_PARTS, id: batch.join(',') },
      });
      results.push(...response.data.items);
    }
    return results;
  }

  // --------------------------------------------------------------------------
  // Channel
  // --------------------------------------------------------------------------

  async getChannel(channelId: string): Promise<ChannelResource> {
    const response = await this.http.get<YouTubeApiResponse<ChannelResource>>('/channels', {
      params: { key: this.apiKey, part: DEFAULT_CHANNEL_PARTS, id: channelId },
    });
    if (!response.data.items.length) {
      throw new YouTubeNotFoundError(`Channel not found: ${channelId}`);
    }
    return response.data.items[0];
  }

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  async searchVideos(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await this.http.get<YouTubeApiResponse<SearchResult>>('/search', {
      params: {
        key: this.apiKey,
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: options?.maxResults ?? 10,
        order: options?.order ?? 'relevance',
        ...(options?.publishedAfter && { publishedAfter: options.publishedAfter }),
        ...(options?.publishedBefore && { publishedBefore: options.publishedBefore }),
        ...(options?.channelId && { channelId: options.channelId }),
      },
    });
    return response.data.items;
  }

  // --------------------------------------------------------------------------
  // Transcript (via InnerTube — free, no API key needed)
  // --------------------------------------------------------------------------

  async getTranscript(videoId: string, lang?: string): Promise<TranscriptResult> {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang });

      const segments: TranscriptSegment[] = raw.map((item) => ({
        text: item.text,
        offset: item.offset,
        duration: item.duration,
        lang: lang,
      }));

      const fullText = segments.map((s) => s.text).join(' ');

      return {
        videoId,
        languageCode: lang ?? 'en',
        segments,
        isAutoGenerated: false, // InnerTube doesn't distinguish; assume manual
        fullText,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('disabled') || message.includes('not available')) {
        throw new YouTubeTranscriptDisabledError(videoId);
      }
      throw error;
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createYouTubeClientFromEnv(options?: YouTubeClientOptions): YouTubeClient {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YouTubeAuthenticationError(
      'Missing YOUTUBE_API_KEY environment variable. ' +
      'Get one at https://console.cloud.google.com/apis/credentials',
    );
  }

  return new YouTubeClient(
    { apiKey },
    {
      maxRetries: process.env.YOUTUBE_MAX_RETRIES ? parseInt(process.env.YOUTUBE_MAX_RETRIES, 10) : options?.maxRetries,
      timeout: process.env.YOUTUBE_TIMEOUT ? parseInt(process.env.YOUTUBE_TIMEOUT, 10) : options?.timeout,
    },
  );
}
