/** 無明長夜 · Supabase Edge Web Push (GitHub Pages 전용). */
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as WebPush from 'npm:@portable/web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PUBLIC_KEY = Deno.env.get('MMJY_VAPID_PUBLIC_KEY') ?? '';
const PRIVATE_KEY = Deno.env.get('MMJY_VAPID_PRIVATE_KEY') ?? '';
const SUBJECT = Deno.env.get('MMJY_VAPID_SUBJECT') || 'https://ignorance.site';
const WEBHOOK_SECRET = Deno.env.get('MMJY_PUSH_WEBHOOK_SECRET') ?? '';
const BASE_ORIGIN = 'https://ignorance.site';
const CATEGORIES = new Set(['soc','farm','study','run','trade','home','etc']);
const ALLOWED_ORIGINS = new Set([BASE_ORIGIN,'https://www.ignorance.site','http://127.0.0.1:8000','http://localhost:8000']);
const admin = createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

function cors(origin:string | null){
  return {
    'Access-Control-Allow-Origin':origin && ALLOWED_ORIGINS.has(origin) ? origin : BASE_ORIGIN,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type, apikey, authorization, x-mmjy-push-secret, x-client-info, x-retry-count, traceparent, tracestate, baggage',
    'Access-Control-Max-Age':'86400',
    'Cache-Control':'no-store',
    'Vary':'Origin',
  };
}
function respond(body:unknown, status=200, origin:string|null=null){
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...cors(origin)}});
}
function allowedEndpoint(raw:unknown){
  if(typeof raw!=='string'||raw.length>2000||raw.length<32)return false;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
    const h=u.hostname.toLowerCase();
    return h==='fcm.googleapis.com'||h==='android.googleapis.com'||
      h==='updates.push.services.mozilla.com'||h==='push.services.mozilla.com'||
      h==='web.push.apple.com'||h.endsWith('.push.apple.com')||
      h==='notify.windows.com'||h.endsWith('.notify.windows.com');
  }catch{return false;}
}
function categories(input:unknown){
  const obj=(input&&typeof input==='object'&&!Array.isArray(input))?input as Record<string,unknown>:{};
  const result:Record<string,boolean>={};
  for(const key of CATEGORIES)result[key]=key==='etc'?obj[key]===true:obj[key]!==false;
  return result;
}
function vapid(){
  if(!PUBLIC_KEY||!PRIVATE_KEY)throw new Error('서버 VAPID 키 설정이 필요합니다.');
  return {subject:SUBJECT,publicKey:PUBLIC_KEY,privateKey:PRIVATE_KEY};
}
async function authenticated(actor:unknown,token:unknown){
  if(typeof actor!=='string'||typeof token!=='string'||!/^[a-z0-9_]{4,20}$/.test(actor)||!/^[a-f0-9]{64}$/.test(token))return false;
  const {data,error}=await admin.from('accounts').select('id').eq('id',actor).eq('pw',token).maybeSingle();
  if(error)throw new Error('계정 검증에 실패했습니다.');
  return !!data;
}
async function sendOne(row:{endpoint:string;keys:unknown},title:string,body:string,destination:string){
  try{
    if(!allowedEndpoint(row.endpoint)){
      await admin.from('mm_push_subscriptions').delete().eq('endpoint',row.endpoint);
      return 'invalid';
    }
    const result=await WebPush.send({
      subscription:{endpoint:row.endpoint,keys:row.keys as {p256dh:string;auth:string}},
      payload:JSON.stringify({title:title.slice(0,90),body:body.slice(0,150),view:destination.slice(0,30),url:BASE_ORIGIN+'/?pushView='+encodeURIComponent(destination)}),
      vapid:vapid(), ttl:86400, urgency:'normal',
    });
    if(result.kind==='gone'){
      await admin.from('mm_push_subscriptions').delete().eq('endpoint',row.endpoint);
      return 'gone';
    }
    return 'sent';
  }catch(e){
    // 공급자 오류나 만료된 구독은 다음 갱신에서 재정리합니다.
    console.error('WebPush send failed:',e instanceof Error?e.message:'unknown');
    return 'error';
  }
}
async function dispatch(eventId:unknown){
  if(typeof eventId!=='number'||!Number.isSafeInteger(eventId)||eventId<=0)throw new Error('잘못된 이벤트 번호');
  const {data:event,error}=await admin.rpc('mm_push_claim',{p_event_id:eventId});
  if(error)throw new Error('이벤트 클레임 실패');
  if(!event)return {ok:true,duplicate:true};
  const {data:subs,error:subsError}=await admin.from('mm_push_subscriptions').select('endpoint,keys,categories').eq('account_id',event.account_id).limit(30);
  if(subsError)throw new Error('구독 목록 조회 실패');
  const valid=(subs||[]).filter((r)=>((r.categories||{}) as Record<string,boolean>)[event.category]===true);
  const statuses=await Promise.all(valid.map((r)=>sendOne(r,event.title,event.body,event.destination)));
  await admin.from('mm_push_events').update({delivered_at:new Date().toISOString()}).eq('id',eventId);
  return {ok:true,count:statuses.filter(s=>s==='sent').length,attempted:valid.length};
}

Deno.serve(async (request)=>{
  const origin=request.headers.get('origin');
  // 브라우저의 OPTIONS 사전 요청에는 쿠키·Bearer JWT가 없으므로 반드시 이곳에서 응답해야 합니다.
  // 단, Supabase 플랫폼의 Verify JWT가 켜져 있으면 이 코드까지 오기도 전에 401로 차단됩니다.
  if(request.method==='OPTIONS'){
    if(origin && !ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403,headers:cors(origin)});
    return new Response(null,{status:204,headers:cors(origin)});
  }
  if(request.method!=='POST')return respond({error:'POST 요청만 지원합니다.'},405,origin);
  if(origin && !ALLOWED_ORIGINS.has(origin))return respond({error:'허용되지 않은 사이트입니다.'},403,origin);
  try{
    const payload=await request.json();
    if(payload?.action==='public-key'){
      return respond({ok:true,publicKey:PUBLIC_KEY||null,ready:Boolean(PUBLIC_KEY&&PRIVATE_KEY&&SERVICE_ROLE_KEY)},200,origin);
    }
    if(payload?.action==='dispatch'||(payload?.table==='mm_push_events' && payload?.type==='INSERT')){
      const supplied=request.headers.get('x-mmjy-push-secret')||'';
      if(!WEBHOOK_SECRET||supplied!==WEBHOOK_SECRET)return respond({error:'Webhook 인증 실패'},401,origin);
      const id=Number(payload?.record?.id);
      return respond(await dispatch(id),200,origin);
    }
    const actor=payload?.actor,token=payload?.token;
    if(!await authenticated(actor,token))return respond({error:'사무전 계정 인증이 필요합니다.'},401,origin);
    if(payload?.action==='history'){
      const {data,error}=await admin.from('mm_push_events').select('id,category,title,body,destination,created_at').eq('account_id',actor).gte('created_at',new Date(Date.now()-7*86400000).toISOString()).order('id',{ascending:false}).limit(75);
      if(error)throw new Error('알림 기록을 불러오지 못했습니다.');
      return respond({ok:true,events:data||[]},200,origin);
    }
    if(payload?.action==='subscribe'){
      const sub=payload?.subscription;
      if(!allowedEndpoint(sub?.endpoint)||typeof sub?.keys?.p256dh!=='string'||typeof sub?.keys?.auth!=='string'||
         sub.keys.p256dh.length>256||sub.keys.auth.length>256)return respond({error:'지원하지 않는 푸시 구독입니다.'},400,origin);
      const {error}=await admin.from('mm_push_subscriptions').upsert({
        endpoint:sub.endpoint,account_id:actor,keys:{p256dh:sub.keys.p256dh,auth:sub.keys.auth},
        categories:categories(payload?.categories),updated_at:new Date().toISOString(),
      },{onConflict:'endpoint'});
      if(error)throw new Error('푸시 구독 저장 실패');
      return respond({ok:true},200,origin);
    }
    if(payload?.action==='unsubscribe'){
      const endpoint=payload?.endpoint;
      if(typeof endpoint==='string')await admin.from('mm_push_subscriptions').delete().eq('account_id',actor).eq('endpoint',endpoint);
      return respond({ok:true},200,origin);
    }
    if(payload?.action==='test'){
      const endpoint=String(payload?.endpoint||'');
      const {data:sub,error}=await admin.from('mm_push_subscriptions').select('endpoint,keys,last_test_at').eq('account_id',actor).eq('endpoint',endpoint).maybeSingle();
      if(error||!sub)return respond({error:'구독을 먼저 켜 주세요.'},400,origin);
      if(sub.last_test_at && Date.now()-new Date(sub.last_test_at).getTime()<60000)
        return respond({error:'테스트 알림은 1분에 한 번만 보낼 수 있습니다.'},429,origin);
      await admin.from('mm_push_subscriptions').update({last_test_at:new Date().toISOString()}).eq('endpoint',endpoint).eq('account_id',actor);
      const result=await sendOne(sub,'無明長夜 · 푸시 테스트','사무전에서 보내는 시험 알림입니다. 사이트를 닫아도 도착하는지 확인해 주세요.','plaza');
      return respond({ok:result==='sent',status:result},result==='sent'?200:502,origin);
    }
    return respond({error:'알 수 없는 요청입니다.'},400,origin);
  }catch(e){
    console.error('Push server error:',e instanceof Error?e.message:'unknown');
    return respond({error:e instanceof Error?e.message:'서버 오류'},500,origin);
  }
});
