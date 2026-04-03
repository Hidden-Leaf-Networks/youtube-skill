import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VideoResource, ChannelResource, TranscriptResult } from '../clients/types.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DB_DIR = path.join(os.homedir(), '.youtube-skill');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'youtube.db');

// ============================================================================
// Store
// ============================================================================

export class YouTubeStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? DEFAULT_DB_PATH;
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  // --------------------------------------------------------------------------
  // Migration
  // --------------------------------------------------------------------------

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        channel_id TEXT,
        channel_title TEXT,
        published_at TEXT,
        duration TEXT,
        view_count INTEGER,
        like_count INTEGER,
        comment_count INTEGER,
        thumbnail_url TEXT,
        tags_json TEXT,
        category_id TEXT,
        has_captions INTEGER DEFAULT 0,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        custom_url TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        thumbnail_url TEXT,
        synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        language_code TEXT NOT NULL DEFAULT 'en',
        is_auto_generated INTEGER DEFAULT 0,
        segments_json TEXT NOT NULL,
        full_text TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        UNIQUE(video_id, language_code),
        FOREIGN KEY (video_id) REFERENCES videos(id)
      );

      CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
      CREATE INDEX IF NOT EXISTS idx_transcripts_video ON transcripts(video_id);
    `);
  }

  // --------------------------------------------------------------------------
  // Upsert
  // --------------------------------------------------------------------------

  upsertVideo(video: VideoResource): void {
    const stmt = this.db.prepare(`
      INSERT INTO videos (id, title, description, channel_id, channel_title, published_at,
        duration, view_count, like_count, comment_count, thumbnail_url, tags_json,
        category_id, has_captions, synced_at)
      VALUES (@id, @title, @description, @channelId, @channelTitle, @publishedAt,
        @duration, @viewCount, @likeCount, @commentCount, @thumbnailUrl, @tagsJson,
        @categoryId, @hasCaptions, @syncedAt)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        channel_id = excluded.channel_id,
        channel_title = excluded.channel_title,
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        thumbnail_url = excluded.thumbnail_url,
        tags_json = excluded.tags_json,
        has_captions = excluded.has_captions,
        synced_at = excluded.synced_at
    `);

    const defaultThumb = video.snippet.thumbnails?.high ?? video.snippet.thumbnails?.default;

    stmt.run({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: parseInt(video.statistics.viewCount, 10) || 0,
      likeCount: parseInt(video.statistics.likeCount, 10) || 0,
      commentCount: parseInt(video.statistics.commentCount, 10) || 0,
      thumbnailUrl: defaultThumb?.url ?? null,
      tagsJson: video.snippet.tags ? JSON.stringify(video.snippet.tags) : null,
      categoryId: video.snippet.categoryId,
      hasCaptions: video.contentDetails.caption === 'true' ? 1 : 0,
      syncedAt: new Date().toISOString(),
    });
  }

  upsertChannel(channel: ChannelResource): void {
    const stmt = this.db.prepare(`
      INSERT INTO channels (id, title, description, custom_url, subscriber_count,
        video_count, thumbnail_url, synced_at)
      VALUES (@id, @title, @description, @customUrl, @subscriberCount,
        @videoCount, @thumbnailUrl, @syncedAt)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        custom_url = excluded.custom_url,
        subscriber_count = excluded.subscriber_count,
        video_count = excluded.video_count,
        thumbnail_url = excluded.thumbnail_url,
        synced_at = excluded.synced_at
    `);

    const defaultThumb = channel.snippet.thumbnails?.high ?? channel.snippet.thumbnails?.default;

    stmt.run({
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      customUrl: channel.snippet.customUrl ?? null,
      subscriberCount: parseInt(channel.statistics.subscriberCount, 10) || 0,
      videoCount: parseInt(channel.statistics.videoCount, 10) || 0,
      thumbnailUrl: defaultThumb?.url ?? null,
      syncedAt: new Date().toISOString(),
    });
  }

  upsertTranscript(videoId: string, result: TranscriptResult): void {
    const stmt = this.db.prepare(`
      INSERT INTO transcripts (video_id, language_code, is_auto_generated, segments_json, full_text, fetched_at)
      VALUES (@videoId, @languageCode, @isAutoGenerated, @segmentsJson, @fullText, @fetchedAt)
      ON CONFLICT(video_id, language_code) DO UPDATE SET
        is_auto_generated = excluded.is_auto_generated,
        segments_json = excluded.segments_json,
        full_text = excluded.full_text,
        fetched_at = excluded.fetched_at
    `);

    stmt.run({
      videoId,
      languageCode: result.languageCode,
      isAutoGenerated: result.isAutoGenerated ? 1 : 0,
      segmentsJson: JSON.stringify(result.segments),
      fullText: result.fullText,
      fetchedAt: new Date().toISOString(),
    });
  }

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  getVideo(videoId: string): VideoResource | undefined {
    const row = this.db.prepare('SELECT * FROM videos WHERE id = ?').get(videoId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToVideo(row);
  }

  getChannel(channelId: string): ChannelResource | undefined {
    const row = this.db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToChannel(row);
  }

  getTranscript(videoId: string, lang?: string): TranscriptResult | undefined {
    const langCode = lang ?? 'en';
    const row = this.db.prepare(
      'SELECT * FROM transcripts WHERE video_id = ? AND language_code = ?',
    ).get(videoId, langCode) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.rowToTranscript(row);
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): { videos: number; channels: number; transcripts: number; lastSync: string | null } {
    const videos = (this.db.prepare('SELECT COUNT(*) as count FROM videos').get() as { count: number }).count;
    const channels = (this.db.prepare('SELECT COUNT(*) as count FROM channels').get() as { count: number }).count;
    const transcripts = (this.db.prepare('SELECT COUNT(*) as count FROM transcripts').get() as { count: number }).count;
    const lastSync = (this.db.prepare('SELECT MAX(synced_at) as last FROM videos').get() as { last: string | null }).last;
    return { videos, channels, transcripts, lastSync };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  close(): void {
    this.db.close();
  }

  // --------------------------------------------------------------------------
  // Row Mapping
  // --------------------------------------------------------------------------

  private rowToVideo(row: Record<string, unknown>): VideoResource {
    return {
      id: row.id as string,
      snippet: {
        title: row.title as string,
        description: (row.description as string) ?? '',
        channelId: (row.channel_id as string) ?? '',
        channelTitle: (row.channel_title as string) ?? '',
        publishedAt: (row.published_at as string) ?? '',
        thumbnails: row.thumbnail_url ? { high: { url: row.thumbnail_url as string, width: 480, height: 360 } } : {},
        tags: row.tags_json ? JSON.parse(row.tags_json as string) : undefined,
        categoryId: (row.category_id as string) ?? '',
      },
      contentDetails: {
        duration: (row.duration as string) ?? '',
        caption: (row.has_captions as number) ? 'true' : 'false',
      },
      statistics: {
        viewCount: String(row.view_count ?? 0),
        likeCount: String(row.like_count ?? 0),
        commentCount: String(row.comment_count ?? 0),
      },
    };
  }

  private rowToChannel(row: Record<string, unknown>): ChannelResource {
    return {
      id: row.id as string,
      snippet: {
        title: row.title as string,
        description: (row.description as string) ?? '',
        customUrl: (row.custom_url as string) ?? undefined,
        publishedAt: '',
        thumbnails: row.thumbnail_url ? { high: { url: row.thumbnail_url as string, width: 240, height: 240 } } : {},
      },
      statistics: {
        viewCount: '0',
        subscriberCount: String(row.subscriber_count ?? 0),
        videoCount: String(row.video_count ?? 0),
      },
    };
  }

  private rowToTranscript(row: Record<string, unknown>): TranscriptResult {
    return {
      videoId: row.video_id as string,
      languageCode: row.language_code as string,
      segments: JSON.parse(row.segments_json as string),
      isAutoGenerated: !!(row.is_auto_generated as number),
      fullText: row.full_text as string,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createYouTubeStoreFromEnv(): YouTubeStore {
  return new YouTubeStore(process.env.YOUTUBE_CACHE_DB_PATH);
}
