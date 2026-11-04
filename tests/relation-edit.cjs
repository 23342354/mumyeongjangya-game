const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create table accounts(id text primary key,pw text);create table social_links(id bigint primary key,from_id text,to_id text,kind text,status text,role_from text,role_to text);insert into accounts values('a','secret'),('b','secret'),('other','secret');insert into social_links values(1,'a','b','relation','accepted','사형','사제'),(2,'a','b','friend','accepted','',''),(3,'a','b','relation','pending','형','동생');`);
 await db.exec(fs.readFileSync('supabase/relation-edit.sql','utf8'));
 const edit=(actor,token,id,a,b)=>db.query('select social_relation_edit($1,$2,$3,$4,$5)',[actor,token,id,a,b]);
 await edit('a','secret',1,'변조한 내 역할',' 후배 ');
 let row=(await db.query('select * from social_links where id=1')).rows[0];assert.equal(row.role_from,'사형','sender cannot change the role chosen by the peer');assert.equal(row.role_to,'후배');
 await edit('b','secret',1,'변조한 내 역할','형');row=(await db.query('select * from social_links where id=1')).rows[0];assert.equal(row.role_from,'형');assert.equal(row.role_to,'후배','recipient cannot overwrite the sender’s choice');assert.equal(row.status,'accepted');
 for(const args of [['other','secret',1,'x','y'],['a','bad',1,'x','y'],['a','secret',2,'x','y'],['a','secret',3,'x','y'],['a','secret',999,'x','y'],['a','secret',1,null,' '],['a','secret',1,'x','y'.repeat(21)]])await assert.rejects(()=>edit(...args));
 await db.close();
 const ctx={console,setInterval(){},setTimeout(){},document:{addEventListener(){}},window:{},VIEWS:{},addFriend(){},relPropose(){},pairEnsure(){},S:{sb:{id:'b'}}};vm.createContext(ctx);
 // Run just the editor functions against the actual caller's perspective.
 const source=fs.readFileSync('social.js','utf8');let html='';Object.assign(ctx,{SOCIAL:{links:[row]},socialId:()=> 'b',socialName:()=> '상대',socialPeer:()=> 'a',esc:s=>s,modal:(t,b)=>html=b});
 vm.runInContext(source.slice(source.indexOf('function socialRelationEdit(id)'),source.indexOf('async function socialRelationEditSave')),ctx);
 ctx.socialRelationEdit(1);assert.match(html,/value="후배"/);assert.match(html,/id="relation-edit-a"[^>]*readonly/);assert.match(html,/value="형"/);assert.match(html,/저장/);
 const game=fs.readFileSync('game.js','utf8'),info=game.slice(game.indexOf('if(METAB==="관계")'),game.indexOf('$("#modalroot").innerHTML',game.indexOf('if(METAB==="관계")')));assert.doesNotMatch(info,/수정 제안/);
 console.log('PASS: only peer-facing title editable from either side; forged protected titles ignored; validation/auth retained; read-only UI and profile proposal removal');
})().catch(e=>{console.error(e);process.exitCode=1;});
