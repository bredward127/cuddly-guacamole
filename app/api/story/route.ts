import { NextResponse } from 'next/server';
type E={sender:string;type:'text'|'image'|'deleted';text:string;imagePrompt:string;delay:number;typing:number;storyTime:string;elapsedMinutes:number;dividerLabel:string};
const n=(x:unknown,a:number,b:number,d:number)=>Math.max(a,Math.min(Number(x)||d,b));

function extractJson(raw:string){
  let t=raw.trim();
  t=t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const start=t.indexOf('{');
  const end=t.lastIndexOf('}');
  if(start===-1||end===-1||end<start)throw new Error('Claude returned invalid story data.');
  return t.slice(start,end+1);
}

async function img(prompt:string){
  const r=await fetch('https://fal.run/fal-ai/flux/schnell',{method:'POST',headers:{Authorization:`Key ${process.env.FAL_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({prompt,image_size:{width:768,height:1024},num_images:1})});
  const j=await r.json();
  if(!r.ok||!j?.images?.[0]?.url)throw new Error('fal.ai image generation failed.');
  return j.images[0].url as string;
}

export async function POST(req:Request){
  try{
    if(!process.env.ANTHROPIC_API_KEY)throw new Error('Missing ANTHROPIC_API_KEY in Vercel environment settings.');
    if(!process.env.FAL_KEY)throw new Error('Missing FAL_KEY in Vercel environment settings.');
    const b=await req.json();
    const p=b.pacing||{};
    const count=n(b.imageCount,0,4,2);
    const length=String(b.length||'45–60 seconds');
    const eventCount=length==='4–5 minutes'?'110-135':length==='2–3 minutes'?'80-105':length==='90 seconds'?'48-60':'28-38';
    const pace={typing:n(p.typing,300,7000,1800),normal:n(p.normal,500,12000,3200),tension:n(p.tension,800,16000,5500),jump:n(p.jump,1200,18000,5000),reveal:n(p.reveal,1200,22000,8500)};
    const premise=String(b.premise||'').slice(0,700);
    if(premise.trim().length<8)return NextResponse.json({error:'Enter a longer story premise.'},{status:400});

    const prompt=`Create an original fictional ${b.genre||'Thriller'} ${b.format||'chat'} story. Premise: ${premise}. Tone: ${b.tone||'Tense'}. Make ${eventCount} events. Exactly ${count} events must have type image; every other event must have a blank imagePrompt string. Respond with ONLY raw JSON (no markdown, no code fences, no commentary) matching: {"title":string,"contactName":string,"subtitle":string,"events":[{"sender":string,"type":"text"|"image"|"deleted","text":string,"imagePrompt":string,"typing":number,"delay":number,"storyTime":string,"elapsedMinutes":number,"dividerLabel":string}]}. Start at 9:41 PM. storyTime must progress naturally through the story. Use elapsedMinutes 0-2 for rapid back-and-forth texts, 3-15 for normal gaps, and 20-1440 for real time jumps. dividerLabel is an empty string unless time jumped meaningfully, in which case use a short label like "18 MINUTES LATER" or "THE NEXT MORNING". Timing in milliseconds: typing ${pace.typing}, normal-message delay ${pace.normal}, tension-message delay ${pace.tension}, time-jump delay ${pace.jump}, image/twist delay ${pace.reveal}. Use normal delay for ordinary dialogue, tension delay for suspicious or emotionally heavy dialogue, jump delay for events with a dividerLabel, and reveal delay for image events, deleted-message events, and the final twist. Write short, natural, phone-readable messages with an immediate hook, rising escalation, and a strong cliffhanger ending. This must be clearly fictional: never depict real people, real private conversations, or copyrighted characters, and never claim the conversation is real.`;

    const claudeRes=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.CLAUDE_MODEL||'claude-sonnet-4-5',max_tokens:12000,messages:[{role:'user',content:prompt}]})});
    if(!claudeRes.ok){
      const detail=await claudeRes.text();
      throw new Error(`Claude request failed (${claudeRes.status}): ${detail.slice(0,300)}`);
    }
    const claudeData=await claudeRes.json();
    const rawText=claudeData?.content?.find((x:{type:string})=>x.type==='text')?.text;
    if(!rawText)throw new Error('Claude did not return any story text.');

    let story:{title:string;contactName:string;subtitle:string;events:E[]};
    try{
      story=JSON.parse(extractJson(rawText));
    }catch{
      throw new Error('Claude returned invalid story data. Please try generating again.');
    }
    if(!Array.isArray(story.events)||story.events.length===0)throw new Error('Claude returned an empty story. Please try again.');

    const visualEvents=story.events.filter(e=>e.type==='image');
    if(visualEvents.length!==count)throw new Error(`The story returned ${visualEvents.length} image event(s) instead of the requested ${count}. Please try generating again.`);

    let imageUrls:string[]=[];
    if(count>0){
      try{
        imageUrls=await Promise.all(visualEvents.map(e=>img(e.imagePrompt)));
      }catch(imgErr){
        throw new Error(imgErr instanceof Error?imgErr.message:'fal.ai image generation failed.');
      }
    }

    let i=0;
    const events=story.events.map((e,idx)=>({...e,id:String(idx),imageUrl:e.type==='image'?imageUrls[i++]:''}));
    return NextResponse.json({...story,events});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e instanceof Error?e.message:'Generation failed.'},{status:500});
  }
}
