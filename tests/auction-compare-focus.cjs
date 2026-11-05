const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('game.js','utf8'),coop=fs.readFileSync('coop.js','utf8');
const host={innerHTML:''},item={main:{v:100},opts:[],slot:'robe',lv:69};
const c={console,VIEW:'merchant',S:{made:true},VIEWS:{},window:{scrollY:100,scrollTo(){}},document:{activeElement:{tagName:'INPUT',type:'checkbox'},getElementById:()=>null,querySelectorAll:()=>[]},$:()=>host,SLOTS:[{k:'robe'}],gearCanEquip:()=>false,gearComparisonData:(_,zero)=>({delta:zero?123:10800,current:item,estimated:false}),gearComparisonTable:(_,zero)=>`<table>${zero?'각인 0':'실제 각인'}</table>`};
vm.createContext(c);vm.runInContext(game.slice(game.indexOf('const MAIN_DISCLOSURES='),game.indexOf('function head(')),c);
vm.runInContext(coop.slice(coop.indexOf('const AUCTION_GEAR_COMPARE='),coop.indexOf('VIEWS.merchant=()=>{')),c);
c.VIEWS.merchant=()=>c.auctionGearComparisonHTML({id:123,item_data:item});
c.renderMain();assert.ok(host.innerHTML.includes('+10,800'));assert.ok(!host.innerHTML.includes('<table>'));
// Browser keeps the checkbox focused during onchange. Manual toggles must render anyway.
c.auctionCompareToggle(123,'compare',true);assert.ok(host.innerHTML.includes('<table>실제 각인</table>'));
c.auctionCompareToggle(123,'zero',true);assert.ok(host.innerHTML.includes('+123'));assert.ok(host.innerHTML.includes('<table>각인 0</table>'));
c.auctionCompareToggle(123,'compare',false);assert.ok(!host.innerHTML.includes('<table>'));
const before=host.innerHTML;c.renderMain(true);assert.equal(host.innerHTML,before,'passive refresh still protects focused input');
console.log('PASS: real renderMain with focused checkbox immediately opens/closes comparison and updates zero-enhancement values');
