import { NextResponse } from 'next/server';

type RawEvent = { sender: string; type: 'text' | 'image' | 'deleted'; text: string; imagePrompt: string; delay: number; typing: number };

const lengthMap: Record<string, { min: number; max: number }> = {
  '20–30 seconds': { min: 14, max: 18 },
  '45–60 seconds': { min: 28, max: 38 },
  '90 seconds': { min: 48, max: 60 },
  '2–3 minutes': { min: 80, max: 105 },
};

function sanitize(value: unknown, limit: number) { return typeof value === 'string' ? value.trim().slice(0, limit) : ''; }

async function makeImage(prompt: string) {
  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: { width: 768, height: 1024 }, num_images: 1, enable_safety_checker: true }),
  });
  if (!response.ok) throw new Error(`fal.ai image request failed (${response.status})`);
  const data = await response.json();
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai did not return an image URL');
  return url as string;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY in server environment.' }, { status: 500 });
    if (!process.env.FAL_KEY) return NextResponse.json({ error: 'Missing FAL_KEY in server environment.' }, { status: 500 });

    const body = await request.json();
    const genre = sanitize(body.genre, 40) || 'Thriller';
    const length = sanitize(body.length, 30) || '45–60 seconds';
    const tone = sanitize(body.tone, 40) || 'Tense';
    const format = sanitize(body.format, 40) || 'Two-person chat';
    const premise = sanitize(body.premise, 700);
    if (premise.length < 8) return NextResponse.json({ error: 'Enter a story premise with at least 8 characters.' }, { status: 400 });

    const target = lengthMap[length] ?? lengthMap['45–60 seconds'];
    const schema = {
      type: 'object', additionalProperties: false,
      properties: {
        title: { type: 'string' },
        contactName: { type: 'string' },
        subtitle: { type: 'string' },
        events: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { sender: { type: 'string' }, type: { type: 'string', enum: ['text', 'image', 'deleted'] }, text: { type: 'string' }, imagePrompt: { type: 'string' }, delay: { type: 'integer' }, typing: { type: 'integer' } }, required: ['sender', 'type', 'text', 'imagePrompt', 'delay', 'typing'] } }
      }, required: ['title', 'contactName', 'subtitle', 'events']
    };

    const prompt = `Create an original, fictional, short-form text-message story. Genre: ${genre}. Tone: ${tone}. Format: ${format}. Premise: ${premise}. Create ${target.min} to ${target.max} events. The hook must be the first event. Messages must be short, natural, and readable on a phone. Create escalating reveals every 4–6 events and a strong final cliffhanger. Exactly two events must be type image; each needs a safe, detailed vertical 3:4 fictional imagePrompt. All other imagePrompt fields must be empty strings. Sender names must be fictional. Never imitate a real person, a real private conversation, a real platform UI, copyrighted characters, or present the story as evidence. Pace it intelligently: 350–800ms pause for quick back-and-forth, 900–1800ms for tension, 1800–3000ms before major reveals. typing is 300–1600ms. Return only the requested JSON.`;

    const claude = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5', max_tokens: 6000, messages: [{ role: 'user', content: prompt }], output_config: { format: { type: 'json_schema', schema } } }),
    });
    if (!claude.ok) throw new Error(`Claude request failed (${claude.status}): ${await claude.text()}`);
    const claudeData = await claude.json();
    const text = claudeData?.content?.find((block: { type: string }) => block.type === 'text')?.text;
    if (!text) throw new Error('Claude did not return story text');
    const story = JSON.parse(text) as { title: string; contactName: string; subtitle: string; events: RawEvent[] };
    const imageEvents = story.events.filter((event) => event.type === 'image');
    if (imageEvents.length !== 2) throw new Error('Story generation did not include exactly two image reveals. Please try again.');
    const images = await Promise.all(imageEvents.map((event) => makeImage(event.imagePrompt)));
    let index = 0;
    const events = story.events.map((event, eventIndex) => ({ ...event, id: `${eventIndex + 1}`, imageUrl: event.type === 'image' ? images[index++] : '' }));
    return NextResponse.json({ ...story, events });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Story generation failed.' }, { status: 500 });
  }
}
