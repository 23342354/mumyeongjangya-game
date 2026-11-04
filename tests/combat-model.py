import math,json
from pathlib import Path
def calc(v,tank=False):
 atk=v*380*(1+v*.035)*(1 if tank else 1.12);spd=round(1+v*.020,2);crit=min(.65,.05+v*.0045);cd=2+v*.035
 return dict(dps=round(atk*spd*(1+crit*(cd-1))),hp=round((520+v*450)*(1.18 if tank else 1)),defense=round(v*98),heal=round(1+v*.04+(.4 if tank else 0),2))
def run(v,tank=False,pair=True):
 c=calc(v,tank);scale=1.7 if pair else 1;members=2 if pair else 1;dps=c['dps']*members;hp=c['hp']*members;mit=9000/(c['defense']+9000)
 tower=guard=0
 for f in range(1,501):
  sec=round(36000*1.07**f)*scale/dps;survive=hp/(round(720*1.065**f)*scale*mit)
  if sec>60 or survive<min(60,sec) or f%50==0 and sec>45:break
  tower=f
 for f in range(1,501):
  if hp*c['heal']/(round(240*1.07**f)*scale*mit*(.8 if tank else 1))<30:break
  guard=f
 rounds=0
 for r in range(1,16):
  sec=round(25000*1.3**r*scale)/dps;sustain=hp*c['heal']/(round(450*1.25**r*scale)*mit*(.8 if tank else 1))
  win=sec<=45 and sustain>=sec if not tank else sustain/1.5>=min(45,sec)
  if not win:break
  rounds=r
 return dict(effective_stats=v,build='수호' if tank else '파괴',members=members,dps=dps,hp=hp,tower=tower,guard=guard,arena_first_season=rounds)
rows=[run(v,t,p) for p in [False,True] for t in [False,True] for v in [3,10,20,40,70,100]]
for p in [1,2]:
 for t in ['수호','파괴']:
  a=[r for r in rows if r['members']==p and r['build']==t]
  for field in ['tower','guard','arena_first_season']:assert [r[field] for r in a]==sorted(r[field] for r in a)
# Shared raid budget: ten pairs, both members' tickets, three uses each day, seven days.
budgets=[dict(member_dps=d,weekly_damage=d*2*30*10*6*7,goal=250000000,stretch=1000000000) for d in [5000,10000,25000,50000]]
output=Path(__file__).resolve().parent.parent/'test-results'/'combat-model.json'
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps({'assumptions':'정규화 모형: 동일한 두 캐릭터, 각 유효 능력치 동일, 추가 장비 옵션/주문/치유 보너스 없음. 실제 14일 성장 시뮬레이션 아님.','profiles':rows,'raid_budgets':budgets},ensure_ascii=False,indent=2))
print(json.dumps([r for r in rows if r['members']==2],ensure_ascii=False))
