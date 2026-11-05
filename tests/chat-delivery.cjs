const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('gameplay.js','utf8'),storage=new Map(),server=new Map();let posts=0,lose=true,deny=false;
 const noop=()=>{},c={AbortController,Date,Math,JSON,Error,Promise,Set,encodeURIComponent,setTimeout:(fn,ms)=>{if(ms<15000)Promise.resolve().then(fn);return 1;},clearTimeout:noop,S:{sb:{id:'alice',url:'https://example.test'},msgs:[]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sbOn:()=>true,sbHead:()=>({apikey:'public'}),chatModeOf:()=> 'RP',save:noop,renderChat:noop,toast:noop,boot:noop,addEventListener:noop};c.window=c;
 c.fetch=async(url,opt)=>{
  if(opt.method==='POST'){
   posts++;if(deny)return {ok:false,status:403,text:async()=>JSON.stringify({code:'42501'})};
   const row=JSON.parse(opt.body)[0],existing=server.get(row.client_request_id);
   if(!existing){row.id=server.size+1;server.set(row.client_request_id,row);}
   if(lose){lose=false;throw new TypeError('reply lost after commit');}
   return {ok:true,status:201,text:async()=>JSON.stringify(existing?[]:[server.get(row.client_request_id)])};
  }
  const id=new URL(url).searchParams.get('client_request_id').slice(3);return {ok:true,status:200,json:async()=>[server.get(id)]};
 };
 c.chatRows=rows=>{for(const r of rows){const m=c.S.msgs.find(m=>m.clientRequestId===r.client_request_id);if(m){m.sid=r.id;m.failed=false;m.pending=false;}else c.S.msgs.push({sid:r.id});}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const CHAT_DELIVERY_BUSY='),source.indexOf('/* 내가 보낸 말은 전송 확인')),c);
 const m={clientRequestId:'chat-request-0001',tab:'전체',scope:'',who:'Alice',body:'긴 원문 <span>그대로</span>',raw:'긴 원문 그대로'};c.S.msgs=[m];c.chatOutboxPut(m);await Promise.all([c.chatDeliver(m),c.chatDeliver(m)]);
 assert.equal(server.size,1,'lost reply retry inserts once');assert.equal(posts,2);assert.ok(m.sid);assert.equal(c.chatOutboxRead().length,0);
 const second={...m,sid:undefined,clientRequestId:'chat-request-0002'};c.S.msgs.push(second);deny=true;c.chatOutboxPut(second);const count=posts;await c.chatDeliver(second);assert.equal(posts,count+1,'permissions are not automatically retried');assert.equal(second.failed,true);assert.equal(c.chatOutboxRead().length,1);assert.ok(second.deliveryError.includes('권한'));
 deny=false;await c.retryChat(second.clientRequestId);assert.equal(server.size,2,'intentional identical messages remain separate');assert.equal(c.chatOutboxRead().length,0);
 const queued={...m,sid:undefined,clientRequestId:'chat-request-0003'};c.chatOutboxPut(queued);c.S.msgs=[];await c.chatResumeDelivery();assert.equal(server.size,3);assert.equal(c.chatOutboxRead().length,0,'reload resumes pending original');
 assert.equal(server.get('chat-request-0003').body,m.body,'body never truncated');console.log('PASS: lost ACK idempotency, permanent error classification, manual retry, identical independent messages and persisted outbox recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
