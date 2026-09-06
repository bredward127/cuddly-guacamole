# TextFlick Studio

A lightweight AI chat-story engine for creating short-form, screen-recordable fictional message stories. This starter app provides an original phone-chat player, automatic typing/message timing, image-reveal placeholders, story inputs, speed controls, and Recording Mode.

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Current demo

The initial build plays a scripted thriller demo entirely in the browser. The Generate button changes the selected prompt and resets playback; it intentionally makes no live API request yet.

## Next implementation steps

1. Add an authenticated server endpoint at `app/api/story/route.ts`.
2. Use Claude Structured Outputs to return a validated story JSON object with typed events, delays, image prompts, and metadata.
3. Submit each image event's `imagePrompt` to fal.ai through a server-side route. Use queued jobs/webhooks, then store resulting URLs.
4. Replace the `baseStory` demo data with saved story data from Supabase.
5. Add user accounts, usage credits, Stripe billing, and a creator dashboard.

## Security

- Do not commit `.env.local` or real API keys.
- Keep Claude and fal.ai calls server-side.
- Apply authentication, rate limits, per-plan credits, content moderation, and request validation before launching.
- Generated conversations must be clearly fictional. Do not present generated chat stories as real messages or evidence.

## Suggested Claude response shape

```ts
type StoryEvent = {
  id: string;
  sender: string;
  type: 'text' | 'image' | 'deleted';
  text?: string;
  imagePrompt?: string;
  delay: number;
  typing: number;
};
```
