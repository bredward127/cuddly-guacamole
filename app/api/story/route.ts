import { NextResponse } from 'next/server';
type E={sender:string;type:'text'|'image'|'deleted';text:string;imagePrompt:string;delay:number;typing:number;storyTime:string;elapsedMinutes:number;dividerLabel:string};
type Story={title:string;contactName:string;subtitle:string;events:E[]};
const n=(x:unknown,a:number,b:number,d:number)=>Math.max(a,Math.min(Number(x)||d,b));

function extractJson(raw:string){
  let t=raw.trim();
  t=t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const start=t.indexOf('{');
  const end=t.lastIndexOf('}');
  if(start===-1||end===-1||end<start)throw new Error('Claude returned invalid story data (no JSON object found).');
  return t.slice(start,end+1);
}

async function img(prompt:string){
  const r=await fetch('https://fal.run/fal-ai/flux/schnell',{method:'POST',headers:{Authorization:`Key ${process.env.FAL_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({prompt,image_size:{width:768,height:1024},num_images:1})});
  const j=await r.json();
  if(!r.ok||!j?.images?.[0]?.url)throw new Error('fal.ai image generation failed.');
  return j.images[0].url as string;
}

async function askClaude(messages:{role:'user'|'assistant';content:string}[],maxTokens:number){
  const claudeRes=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY as string,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.CLAUDE_MODEL||'claude-sonnet-4-5',max_tokens:maxTokens,messages})});
  if(!claudeRes.ok){
    const detail=await claudeRes.text();
    throw new Error(`Claude request failed (${claudeRes.status}): ${detail.slice(0,300)}`);
  }
  const claudeData=await claudeRes.json();
  const rawText=claudeData?.content?.find((x:{type:string})=>x.type==='text')?.text;
  const stopReason=claudeData?.stop_reason;
  const usage=claudeData?.usage;
  if(!rawText)throw new Error('Claude did not return any story text.');
  if(stopReason==='max_tokens')throw new Error(`Claude's response was cut off before finishing (stop_reason: max_tokens, output_tokens: ${usage?.output_tokens ?? 'unknown'}). Try a shorter length or fewer images.`);
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
  const imageIdx=events.map((e,i)=>e.type==='image'?i:-1).filter(i=>i>=0);
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

function tokenBudget(length:string){
  if(length==='4–5 minutes')return 28000;
  if(length==='2–3 minutes')return 20000;
  if(length==='90 seconds')return 12000;
  return 8000;
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
    const format=String(b.format||'Two-person chat');
    const isGroup=/group/i.test(format);
    const pace={typing:n(p.typing,300,7000,1800),normal:n(p.normal,500,12000,3200),tension:n(p.tension,800,16000,5500),jump:n(p.jump,1200,18000,5000),reveal:n(p.reveal,1200,22000,8500)};
    const premise=String(b.premise||'').slice(0,700);
    if(premise.trim().length<8)return NextResponse.json({error:'Enter a longer story premise.'},{status:400});

    const countWord=count===0?'zero':String(count);
    const senderRule=isGroup
      ? 'This is a GROUP CHAT. Use at least 3 distinct fictional participant names as "sender" values across the conversation (for example: Maya, Jordan, Priya), each used consistently and repeatedly. Do NOT use a generic label like "Group" or "Unknown" as a sender — every event must have one specific character\'s name as the sender. The user reading this story is one specific named participant in the group; use that same name every time that participant speaks.'
      : 'This is a ONE-ON-ONE CHAT. Use exactly two distinct "sender" values total across the whole story: one consistent name for the user (for example the protagonist), and one consistent name or label for the other person (for example "Unknown Number" or a character name). Never introduce a third sender.';

    const prompt=`IMPORTANT REQUIREMENT: This story must contain EXACTLY ${countWord} (${count}) events with "type":"image". Not more, not fewer. Count them before responding.\n\n${senderRule}\n\nCreate an original fictional ${b.genre||'Thriller'} ${format} story. Premise: ${premise}. Tone: ${b.tone||'Tense'}. Make ${eventCount} total events. Exactly ${count} of those events must have "type":"image"; every other event must have an empty imagePrompt string (""). Respond with ONLY raw JSON (no markdown, no code fences, no commentary) matching: {"title":string,"contactName":string,"subtitle":string,"events":[{"sender":string,"type":"text"|"image"|"deleted","text":string,"imagePrompt":string,"typing":number,"delay":number,"storyTime":string,"elapsedMinutes":number,"dividerLabel":string}]}. Start at 9:41 PM. storyTime must progress naturally through the story. Use elapsedMinutes 0-2 for rapid back-and-forth texts, 3-15 for normal gaps, and 20-1440 for real time jumps. dividerLabel is an empty string unless time jumped meaningfully, in which case use a short label like "18 MINUTES LATER" or "THE NEXT MORNING". Timing in milliseconds: typing ${pace.typing}, normal-message delay ${pace.normal}, tension-message delay ${pace.tension}, time-jump delay ${pace.jump}, image/twist delay ${pace.reveal}. Use normal delay for ordinary dialogue, tension delay for suspicious or emotionally heavy dialogue, jump delay for events with a dividerLabel, and reveal delay for image events, deleted-message events, and the final twist. Write short, natural, phone-readable messages with an immediate hook, rising escalation, and a strong cliffhanger ending. This must be clearly fictional: never depict real people, real private conversations, or copyrighted characters, and never claim the conversation is real.\n\nFINAL REMINDER: your events array must contain EXACTLY ${count} objects where "type":"image", and sender names must follow the chat-type rule above exactly.`;

    const rawText=await askClaude([{role:'user',content:prompt}],tokenBudget(length));
    let story=parseStory(rawText);
    let visualEvents=story.events.filter(e=>e.type==='image');

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

    const senderOrder:string[]=[];
    for(const e of story.events){
      if(e.sender&&!senderOrder.includes(e.sender))senderOrder.push(e.sender);
    }
    const youSender=senderOrder[0]||'You';

    let i=0;
    const events=story.events.map((e,idx)=>({
      ...e,
      id:String(idx),
      imageUrl:e.type==='image'?imageUrls[i++]:'',
      isMe:e.sender===youSender,
    }));
    return NextResponse.json({...story,events,senders:senderOrder,youSender,isGroup});
  }catch(e){
    console.error(e);
    return NextResponse.json({error:e instanceof Error?e.message:'Generation failed.'},{status:500});
  }
}
