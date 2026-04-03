# YouTube Intelligence (Library-Based Skill)

This project uses `@hidden-leaf/youtube-skill` — a TypeScript library for YouTube content extraction.
This is NOT an MCP tool or registered skill. To use it, write a TypeScript script and execute it with `npx tsx <script>.ts`.

## Setup
- API key in `.env` (see `node_modules/@hidden-leaf/youtube-skill/.env.example`)
- Required: `YOUTUBE_API_KEY` (for metadata — transcripts are free)

## Usage
When the user asks about YouTube videos, transcripts, video summaries, or wants to extract content from YouTube — use this skill.
Read node_modules/@hidden-leaf/youtube-skill/SKILL.md for the full API before using.

## How to Use
Write a .ts script, then run it with `npx tsx <script>.ts`:
```typescript
import { createTranscriptSkillFromEnv } from '@hidden-leaf/youtube-skill';

const skill = createTranscriptSkillFromEnv();

// Fetch transcript (auto-caches)
const result = await skill.fetchTranscript('https://youtube.com/watch?v=VIDEO_ID');
console.log(result.formatted);

// Video metadata only
const meta = await skill.fetchVideoMetadata('VIDEO_ID');

// Channel info
const channel = await skill.fetchChannelInfo('CHANNEL_ID');

// Cache stats
const stats = skill.stats();
```
Then execute: `npx tsx <script>.ts`
