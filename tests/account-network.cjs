const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('gameplay.js','utf8');
const start=source.indexOf('async function acctFetch(');
const end=source.indexOf('\n\n/* ── 로그인 상태',start);
let timer,cleared=0,calls=0,mode='ok';
const ctx={AbortController,acctCfg:()=>({url:'https://example.test',key:'test'}),
 setTimeout:f=>{timer=f;return 1},clearTimeout:()=>cleared++,
 fetch:async(_url,o)=>{calls++;if(mode==='pending')return new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true}));
 return {ok:mode!=='http',status:503,text:async()=>mode==='body'?new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true})):mode==='http'?'server unavailable':'{"ok":true}'};}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 assert.equal((await ctx.acctFetch('rpc/test')).ok,true);
 mode='pending';let p=ctx.acctFetch('rpc/save',{method:'POST'});timer();await assert.rejects(p,{name:'AbortError'});assert.equal(calls,2,'uncertain writes must not be automatically replayed');
 mode='body';p=ctx.acctFetch('rpc/save');await new Promise(setImmediate);timer();await assert.rejects(p,{name:'AbortError'});
 mode='pending';const external=new AbortController();p=ctx.acctFetch('rpc/test',{signal:external.signal});external.abort();await assert.rejects(p,{name:'AbortError'});
 mode='http';await assert.rejects(ctx.acctFetch('rpc/test'),/server unavailable/);
 assert.equal(cleared,5,'all outcomes release timers');
 const sb=source.match(/function sbOn\(\)\{[^\n]+/)[0];vm.runInContext('var S=null;'+sb,ctx);assert.equal(ctx.sbOn(),false);
 console.log('PASS: bounded requests and response bodies, caller cancellation, no write retries, HTTP errors, timer cleanup and login-state polling');
})().catch(e=>{console.error(e);process.exitCode=1});
