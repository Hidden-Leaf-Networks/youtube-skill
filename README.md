# @hidden-leaf/youtube-skill

YouTube content extraction and intelligence skill for Claude Code.

Fetches transcripts, video metadata, and channel info with local SQLite caching. Transcript extraction is free (InnerTube) — metadata uses YouTube Data API v3.

## Quick Start

```bash
npm install @hidden-leaf/youtube-skill
```

Set `YOUTUBE_API_KEY` in your `.env` (see `.env.example`).

```typescript
import { createTranscriptSkillFromEnv } from '@hidden-leaf/youtube-skill';

const skill = createTranscriptSkillFromEnv();
const result = await skill.fetchTranscript('https://youtube.com/watch?v=VIDEO_ID');
console.log(result.formatted);
```

## License

Apache-2.0 — Hidden Leaf Networks
