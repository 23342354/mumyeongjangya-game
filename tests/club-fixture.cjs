const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
module.exports=async function(db){
 const root=path.resolve(__dirname,'..');
 await db.exec(`create role anon;create role authenticated;create table accounts(id text primary key,pw text,name text,save jsonb,seen_at timestamptz default now());create table pairs(id bigint primary key,from_id text,to_id text,status text,rent_due double precision default 0);create table students(id text primary key);create table messages(id bigint primary key,tab text,scope text);`);
 for(const file of ['중개소-러너간거래-설치.sql','페어-공동플레이-설치.sql'])await db.exec(cp.execFileSync('git',['show','b77fa80:'+file],{cwd:root,encoding:'utf8'}));
 await db.exec(fs.readFileSync(path.join(root,'supabase/pair-sync-performance.sql'),'utf8'));
 const seed={made:true,name:'test',rin:500000,mana:100,know:1,pass:2,sari:0,lotus:0,mat:{약초:100},ing:{},bmat:{},ingredients:{},inv:{},potion:{q1:10},bag:[{id:1,name:'테스트 법의',slot:'robe',grade:1,lv:1}],gid:2,wb:{tickets:2,dmg:0},fest:{marks:0},kit:{have:{d1:5}},farm:{skill:1,exp:0,seeds:{c1:30},fertilizers:{},fert:0,plots:[]},fish:{skill:1,exp:0,catches:{}},home:{stage:0},hall:'dorm',quests:{},dex:{},arena:{round:1},res:{},exp:0,lvl:1,hp:100,sn:100,lastReal:Date.now(),balance20:{pendingLoot:[],bossClaims:[]}};
 for(const id of ['alice','bob','eve'])await db.query('insert into accounts(id,pw,name,save) values($1,$2,$1,$3)',[id,'secret',seed]);
 return seed;
};
