import { NextResponse } from 'next/server';
type E={sender:string;type:'text'|'image'|'deleted';text:string;imagePrompt:string;delay:number;typing:number;storyTime:string;elapsedMinutes:number;dividerLabel:string};
type Story={title:string;contactName:string;subtitle:string;events:E[]};
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

async function askClaude(messages:{role:'user'|'assistant';content:string}[]){
  const claudeRes=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY as string,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.CLAUDE_MODEL||'claude-sonnet-4-5',max_tokens:12000,messages})});
  if(!claudeRes.ok){
    const detail=await claudeRes.text();
    throw new Error(`Claude request failed (${claudeRes.status}): ${detail.slice(0,300)}`);
  }
  const claudeData=await claudeRes.json();
  const rawText=claudeData?.content?.find((x:{type:string})=>x.type==='text')?.text;
  if(!rawText)throw new Error('Claude did not return any story text.');
  return rawText as string;
}

function parseStory(rawText:string){
  let story:Story;
  try{
    story=JSON.parse(extractJson(rawText));
  }catch{
    throw new Error('Claude returned invalid story data. Please try generating again.');
  }
  if(!Array.isArray(story.events)||story.events.length===0)throw new Error('Claude returned an empty story. Please try again.');
  return story;
}

function forceImageCount(story:Story,count:number){
  const events=[...story.events];
  let imageIdx=events.map((e,i)=>e.type==='image'?i:-1).filter(i=>i>=0);
  if(imageIdx.length>count){
    const extra=imageIdx.slice(count);
    for(const i of extra){events[i]={...events[i],type:'text',imagePrompt:''};}
  } else if(imageIdx.length<count){
    const textIdx=events.map((e,i)=>e.type==='text'?i:-1).filter(i=>i>=0);
    const need=count-imageIdx.length;
    const pickFrom=textIdx.filter(i=>!imageIdx.includes(i));
    const step=Math.max(1,Math.floor(pickFrom.length/(need+1)));
    let picked=0;
    for(let k=step;k<pickFrom.length&&picked<need;k+=step){
      const i=pickFrom[k];
      if(events[i].type==='text'){
        events[i]={...events[i],type:'image',imagePrompt:events[i].imagePrompt||`A cinematic, vertical, suspenseful photo related to: ${events[i].text}`.slice(0,300)};
        picked++;
      }
    }
    while(picked<need&&pickFrom.length){
      const i=pickFrom[pickFrom.length-1-picked];
      if(i!==undefined&&events[i].type==='text'){
        events[i]={...events[i],type:'image',imagePrompt:events[i].imagePrompt||`A cinematic, vertical, suspenseful photo related to: ${events[i].text}`.slice(0,300)};
        picked++;
      } else break;
    }
  }
  return {...story,events};
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

    const countWord=count===0?'zero':String(count);
    const prompt=`IMPORTANT REQUIREMENT: This story must contain EXACTLY ${countWord} (${count}) events with "type":"image". Not more, not fewer. Count them before responding.\n\nCreate an original fictional ${b.genre||'Thriller'} ${b.format||'chat'} story. Premise: ${premise}. Tone: ${b.tone||'Tense'}. Make ${eventCount} total events. Exactly ${count} of those events must have "type":"image"; every other event must have an empty imagePrompt string (""). Respond with ONLY raw JSON (no markdown, no code fences, no commentary) matching: {"title":string,"contactName":string,"subtitle":string,"events":[{"sender":string,"type":"text"|"image"|"deleted","text":string,"imagePrompt":string,"typing":number,"delay":number,"storyTime":string,"elapsedMinutes":number,"dividerLabel":string}]}. Start at 9:41 PM. storyTime must progress naturally through the story. Use elapsedMinutes 0-2 for rapid back-and-forth texts, 3-15 for normal gaps, and 20-1440 for real time jumps. dividerLabel is an empty string unless time jumped meaningfully, in which case use a short label like "18 MINUTES LATER" or "THE NEXT MORNING". Timing in milliseconds: typing ${pace.typing}, normal-message delay ${pace.normal}, tension-message delay ${pace.tension}, time-jump delay ${pace.jump}, image/twist delay ${pace.reveal}. Use normal delay for ordinary dialogue, tension delay for suspicious or emotionally heavy dialogue, jump delay for events with a dividerLabel, and reveal delay for image events, deleted-message events, and the final twist. Write short, natural, phone-readable messages with an immediate hook, rising escalation, and a strong cliffhanger ending. This must be clearly fictional: never depict real people, real private conversations, or copyrighted characters, and never claim the conversation is real.\n\nFINAL REMINDER: your events array must contain EXACTLY ${count} objects where "type":"image". Double-check this before responding.`;

    const conversation:{role:'user'|'assistant';content:string}[]=[{role:'user',content:prompt}];
    let rawText=await askClaude(conversation);
    let story=parseStory(rawText);
    let visualEvents=story.events.filter(e=>e.type==='image');

    if(visualEvents.length!==count){
      conversation.push({role:'assistant',content:rawText});
      conversation.push({role:'user',content:`Your previous response had exactly ${visualEvents.length} image event(s), but exactly ${count} are required. Return the corrected FULL story JSON again, with the exact same story content and structure, but with exactly ${count} events set to "type":"image" and all others set to "type":"text" or "deleted". Respond with ONLY raw JSON, no markdown, no commentary.`});
      rawText=await askClaude(conversation);
      story=parseStory(rawText);
      visualEvents=story.events.filter(e=>e.type==='image');
    }

    if(visualEvents.length!==count){
      story=forceImageCount(story,count);
      visualEvents=story.events.filter(e=>e.type==='image');
    }

    let imageUrls:string[]=[];
    if(count>0){
      try{
        imageUrls=await Promise.all(visualEvents.map(e=>img(e.imagePrompt||'A cinematic vertical suspenseful photo, fictional scene')));
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
