import { VideoResource, ChannelResource, TranscriptResult } from '../../clients/types.js';

export interface FetchTranscriptOptions {
  /** Language code for the transcript (default: 'en') */
  lang?: string;
  /** Force re-fetch even if cached */
  refresh?: boolean;
  /** Include timestamps in formatted output */
  includeTimestamps?: boolean;
}

export interface TranscriptOutput {
  video: VideoResource;
  transcript: TranscriptResult;
  /** Full transcript as a single formatted string */
  formatted: string;
  /** Whether this result came from cache */
  fromCache: boolean;
}

export interface VideoMetadataOutput {
  video: VideoResource;
  fromCache: boolean;
}

export interface ChannelInfoOutput {
  channel: ChannelResource;
  fromCache: boolean;
}

export interface StatsOutput {
  videos: number;
  channels: number;
  transcripts: number;
  lastSync: string | null;
}
