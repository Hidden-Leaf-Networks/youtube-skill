#!/usr/bin/env node
/**
 * postinstall hook — auto-injects youtube-skill context into the
 * consuming project's CLAUDE.md so Claude Code picks it up immediately.
 *
 * Safe to re-run: skips if the section already exists.
 * Only runs when installed as a dependency (not during local dev).
 */

const fs = require('fs');
const path = require('path');

const MARKER = '<!-- @hidden-leaf/youtube-skill -->';

const SNIPPET = `
${MARKER}
## YouTube Intelligence (Library-Based Skill)

This project uses \`@hidden-leaf/youtube-skill\` — a TypeScript library for YouTube content extraction.
This is NOT an MCP tool or registered skill. To use it, write a TypeScript script and execute it with \`npx tsx <script>.ts\`.

**Setup:** API key in \`.env\` — needs \`YOUTUBE_API_KEY\` (transcripts are free without it).
See node_modules/@hidden-leaf/youtube-skill/.env.example for all options.

**Skill reference:** Read node_modules/@hidden-leaf/youtube-skill/SKILL.md for the full API before using.

**How to use:** Write a .ts script, then run it:
\`\`\`typescript
import { createTranscriptSkillFromEnv } from '@hidden-leaf/youtube-skill';
const skill = createTranscriptSkillFromEnv();

// Fetch transcript: await skill.fetchTranscript('https://youtube.com/watch?v=VIDEO_ID')
// Video metadata: await skill.fetchVideoMetadata('VIDEO_ID')
// Channel info: await skill.fetchChannelInfo('CHANNEL_ID')
\`\`\`
Then execute: \`npx tsx <script>.ts\`
<!-- /@hidden-leaf/youtube-skill -->
`.trimStart();

function findProjectRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    dir = path.dirname(dir);
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (json.name === '@hidden-leaf/youtube-skill') continue;
        return dir;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function run() {
  const ownPkg = path.resolve(__dirname, '..', 'package.json');
  if (fs.existsSync(ownPkg)) {
    try {
      const json = JSON.parse(fs.readFileSync(ownPkg, 'utf8'));
      if (json.name === '@hidden-leaf/youtube-skill') {
        if (!__dirname.includes('node_modules')) return;
      }
    } catch {
      // continue
    }
  }

  const root = findProjectRoot();
  if (!root) return;

  const claudeMd = path.join(root, 'CLAUDE.md');

  if (fs.existsSync(claudeMd)) {
    const existing = fs.readFileSync(claudeMd, 'utf8');
    if (existing.includes(MARKER)) return;
    fs.writeFileSync(claudeMd, existing.trimEnd() + '\n\n' + SNIPPET);
    console.log('[@hidden-leaf/youtube-skill] Added YouTube intelligence section to CLAUDE.md');
    console.log('[@hidden-leaf/youtube-skill] Restart Claude Code to activate the skill');
  } else {
    fs.writeFileSync(claudeMd, SNIPPET);
    console.log('[@hidden-leaf/youtube-skill] Created CLAUDE.md with YouTube intelligence');
    console.log('[@hidden-leaf/youtube-skill] Restart Claude Code to activate the skill');
  }

  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) {
    const envExample = path.resolve(__dirname, '..', '.env.example');
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log('[@hidden-leaf/youtube-skill] Created .env from template — fill in your YouTube API key');
    }
  }
}

try {
  run();
} catch {
  // postinstall should never break npm install
}
