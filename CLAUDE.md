# @hidden-leaf/youtube-skill

## Project Overview
YouTube content extraction and intelligence skill for Claude Code. Fetches transcripts, video metadata, and channel info with local SQLite caching.

## Architecture
- `src/clients/` — YouTube Data API v3 HTTP client, API key auth, transcript extraction via InnerTube
- `src/skills/transcript/` — v0.5 skill: fetch transcripts, video metadata, channel info, cache-first reads
- `src/cache/` — SQLite persistence layer (videos, channels, transcripts)
- `src/utils/` — Structured logger

### Planned (v1.0+)
- `src/skills/repurpose/` — Video-to-blog, video-to-summary, video-to-lesson
- `src/skills/chapters/` — Chapter detection and segment extraction
- `src/skills/playlist/` — Playlist and channel batch processing

## Development
- **Build:** `npm run build`
- **Test:** `npm test` (jest + ts-jest)
- **Lint:** `npm run lint`
- **Run scripts:** `npx tsx <script>.ts`
- **Publish:** `npm publish --access public`

## Conventions
- TypeScript strict mode, ES2022 target, NodeNext modules
- All clients use factory pattern: `create*FromEnv()` reads from env vars
- Errors: `YouTubeApiRequestError`, `YouTubeAuthenticationError`, `YouTubeQuotaExceededError`, `YouTubeNotFoundError`
- YouTube Data API v3 base URL: `https://www.googleapis.com/youtube/v3`
- Transcript extraction is free (InnerTube) — metadata costs API quota
- Cache-first reads: fetch once, serve from SQLite forever

## Skill Reference
See [SKILL.md](./SKILL.md) for the full API reference that Claude Code uses when this package is installed in other projects.

<!-- @hidden-leaf/atlassian-skill -->
## Atlassian Integration (Library-Based Skill)

This project uses `@hidden-leaf/atlassian-skill` — a TypeScript library for Jira, Confluence, and Bitbucket.
This is NOT an MCP tool or registered skill. To use it, write a TypeScript script and execute it with `npx tsx <script>.ts`.

**Setup:** Credentials in `.env` — needs `ATLASSIAN_CLOUD_ID`, `ATLASSIAN_SITE_URL`, `ATLASSIAN_USER_EMAIL`, `ATLASSIAN_API_TOKEN`.
See node_modules/@hidden-leaf/atlassian-skill/.env.example for all options.

**Skill reference:** Read node_modules/@hidden-leaf/atlassian-skill/SKILL.md for the full API before using.

**How to use:** Write a .ts script, then run it:
```typescript
import { createJiraClientFromEnv, jql, adf, text } from '@hidden-leaf/atlassian-skill';
const jira = createJiraClientFromEnv();

// Search: jira.searchIssues({ jql: jql().equals('project', 'PROJ').build() })
// Create: jira.createIssue({ project: 'PROJ', issuetype: 'Task', summary: '...' })
// Transition: jira.transitionIssue('PROJ-123', { transitionId: '...' })
// Comment: jira.addComment('PROJ-123', { body: adf().paragraph('text').build() })
```
Then execute: `npx tsx <script>.ts`
<!-- /@hidden-leaf/atlassian-skill -->
