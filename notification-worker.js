/* 無明長夜 · 오프라인 Web Push. 서비스 워커는 로그인 정보를 보관하지 않습니다. */
const ALLOWED_VIEWS=new Set(['plaza','pairhub','rpboard','rel','market','farm','class','quest','hallv','record','research']);
self.addEventListener('push',(event)=>{
  let data={title:'無明長夜 · 사무전',body:'새 소식이 도착했습니다.',view:'plaza'};
  try{
    if(event.data){ const payload=event.data.json();
      if(payload && typeof payload==='object')data={...data,...payload}; }
  }catch(e){/* 보낼 수 없는 메시지는 기본 문구로 표시 */}
  const view=ALLOWED_VIEWS.has(data.view)?data.view:'plaza';
  const options={
    body:String(data.body||'새 소식이 도착했습니다.').slice(0,160),
    icon:'favicon-180.png',badge:'favicon.png',
    tag:'mmjy-'+view+'-'+Date.now(),renotify:false,
    data:{url:'./?pushView='+encodeURIComponent(view)},
  };
  event.waitUntil(self.registration.showNotification(String(data.title||'無明長夜 · 사무전').slice(0,90),options));
});
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  let destination=new URL('./',self.registration.scope);
  try{destination=new URL(event.notification.data?.url||'./',self.registration.scope);}catch(e){}
  if(destination.origin!==self.location.origin)destination=new URL('./',self.registration.scope);
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async(clients)=>{
    const client=clients.find(c=>new URL(c.url).origin===destination.origin);
    if(client){await client.focus();client.postMessage({type:'mmjy-push-open',view:destination.searchParams.get('pushView')});return;}
    return self.clients.openWindow(destination.href);
  }));
});
