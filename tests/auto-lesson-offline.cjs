const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('game.js','utf8'),visuals=fs.readFileSync('visuals.js','utf8');
const noop=()=>{};
function setup(need=4){
 const c={console,Math,JSON,Date,S:{course:1,examHist:{},sub:{a:{lv:0,p:0},b:{lv:0,p:0}},lesson:null},COURSES:[{subs:['a','b'],need}],SUBJECTS:[{id:'a',n:'A'},{id:'b',n:'B'}],SUBJECT_TRAINING:{a:{per:{}},b:{per:{}}},SUBJECT_MILESTONES:[],VIEW:'class',balanceEnsure:noop,toast:noop,save:noop,renderTop:noop,renderNav:noop,renderMain:noop,hhmm:String,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),mod:()=>0,subjectLevel:id=>c.S.sub[id].lv,classEffectText:()=>'',gainKnow:n=>c.know+=n,gainExp:n=>c.xp+=n,addMark:n=>c.marks+=n,know:0,xp:0,marks:0};c.window=c;vm.createContext(c);
 vm.runInContext(game.slice(game.indexOf('function subjectLessonCount('),game.indexOf('function subjectSyllabus(')),c);
 vm.runInContext(game.slice(game.indexOf('function finishPeriod(){'),game.indexOf('function editPlan(')),c);
 vm.runInContext(visuals.slice(visuals.indexOf('window.balanceLessonQueue='),visuals.indexOf('const oldExam=takeExam;')),c);
 const lessonBlock=game.slice(game.indexOf('  // 수업\n'),game.indexOf('  // 수행(연구)'));
 vm.runInContext('function advance(mins){'+lessonBlock+'}',c);return c;
}
for(const hours of [4,8]){
 const offline=setup(),online=setup();offline.balanceLessonQueue(hours);online.balanceLessonQueue(hours);
 const plan=[...offline.S.lesson.plan],budget=offline.lessonPlanMinutes(plan);assert.ok(budget<=hours*60&&plan.length>1);
 offline.advance(8*60);for(let m=0;m<8*60;m++)online.advance(1);
 assert.equal(offline.S.lesson,null,'overnight catch-up finishes the full queue');
 assert.equal(JSON.stringify(offline.S.sub),JSON.stringify(online.S.sub),'all subsequent periods carry elapsed time');
 assert.equal(offline.know,online.know);assert.equal(offline.xp,online.xp);assert.equal(offline.marks,online.marks);
 const before=offline.xp;offline.advance(480);assert.equal(offline.xp,before,'finished queue never repeats');
}
const ready=setup(1);ready.balanceLessonQueue(8);assert.equal(ready.S.lesson.plan.length,2);ready.advance(480);assert.equal(ready.S.sub.a.lv,1);assert.equal(ready.S.sub.b.lv,1);assert.equal(ready.S.lesson,null,'stops when exam requirements are met');
ready.balanceLessonQueue(8);assert.equal(ready.S.lesson,null,'already prepared starts no further lessons');
console.log('PASS: 4h/8h automatic plans, overnight multi-period catch-up, online/offline rewards, time budgets and exam-ready stop');
