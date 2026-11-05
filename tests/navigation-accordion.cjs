const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('game.js','utf8');
const ctx={NAVDEF:[{id:'study',sub:[{id:'class'}]},{id:'craft',sub:[{id:'farm'}]},{id:'home'}],NAVOPEN:{},VIEW:'class',renderNav(){},renderMain(){},window:{scrollTo(){}}};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('function navOpen('),source.indexOf('const MOBILE_GROUP_NAMES='))+source.slice(source.indexOf('function toggleNav(id)'),source.indexOf('/* ── 채팅 ── */')),ctx);
assert.equal(ctx.navOpen(ctx.NAVDEF[0]),true);ctx.toggleNav('craft');assert.equal(ctx.NAVOPEN.study,false);assert.equal(ctx.NAVOPEN.craft,true);ctx.toggleNav('craft');assert.equal(ctx.NAVOPEN.craft,false);assert.equal(ctx.NAVOPEN.study,false);ctx.toggleNav('missing');
ctx.go('farm');assert.equal(ctx.NAVOPEN.craft,true);assert.equal(ctx.NAVOPEN.study,false);ctx.go('class');assert.equal(ctx.NAVOPEN.study,true);assert.equal(ctx.NAVOPEN.craft,false);ctx.go('home');assert.equal(ctx.NAVOPEN.study,false);assert.equal(ctx.NAVOPEN.craft,false);
const css=fs.readFileSync('game.css','utf8');assert.match(css,/@media\(min-width:781px\)\{\s*#navcol\{position:sticky;top:var\(--chat-top,112px\)/);assert.match(source,/navHost.scrollTop=navScrollY/);
console.log('PASS: opening another group closes the old group, toggling closed stays closed, navigation keeps only current group open, direct pages close all, desktop sticky and scroll preservation');
