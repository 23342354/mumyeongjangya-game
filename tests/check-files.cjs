const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const exists=f=>assert.ok(fs.existsSync(path.join(root,f.split(/[?#]/)[0])),`Missing local resource: ${f}`);
const html=read('index.html');
const scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"><\/script>/g)].map(m=>m[1]);
assert.deepEqual(scripts,['game.js','config.js','notifications.js','gameplay.js','social.js','community.js','visuals.js','coop.js'],'Classic script order is part of the runtime contract');
for(const f of [...scripts,'notification-worker.js','scripts/generate-vapid.cjs'])new vm.Script(read(f),{filename:f});
for(const m of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){if(!/^(?:https?:|data:|#)/.test(m[1]))exists(m[1]);}
for(const m of read('game.css').matchAll(/url\(['"]?([^'"\s)]+)['"]?\)/g)){if(!/^(?:data:|https?:|#)/.test(m[1]))exists(m[1].split('?')[0]);}
const files=JSON.parse(read('game.js').match(/const UPDFILES=(\[[^;]+\]);/)[1]);
assert.equal(new Set(files).size,files.length);for(const f of files)exists(f);
for(const f of [...scripts,'game.css','index.html','notification-worker.js','manifest.webmanifest'])assert.ok(files.includes(f),`Update detection omits ${f}`);
const manifest=JSON.parse(read('manifest.webmanifest'));for(const icon of manifest.icons||[])exists(icon.src);
const expected={
 'gameplay.js':['part2.js','part3.js','part4.js','part5.js','part6.js','part7.js'],
 'community.js':['part8.js','part9.js','part10.js','part11.js','part12.js','market.js','pvp.js','part13.js','part14.js'],
 'visuals.js':['pixel-scenes.js','pixel-life.js','balance20.js'],
 'coop.js':['pair-play.js','auction-live.js']
};
for(const [f,modules]of Object.entries(expected))assert.deepEqual([...read(f).matchAll(/\/\* ===== module: ([^ ]+) ===== \*\//g)].map(m=>m[1]),modules);
assert.ok(!/<script>(?!\s*<)/.test(html),'Application code should live in game.js');
console.log(`PASS: ${scripts.length} ordered scripts, worker syntax, local resources, cache detection, manifest and module boundaries`);
