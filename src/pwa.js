export async function startAppUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const workers=navigator.serviceWorker;
  const workerUrl=new URL('../sw.js',import.meta.url);
  const banner=document.querySelector('#app-update');
  let controller=workers.controller;

  workers.addEventListener('controllerchange',()=>{
    const next=workers.controller;
    if (controller && next && next!==controller) banner.hidden=false;
    controller=next;
  });
  banner.querySelector('button').addEventListener('click',()=>location.reload());

  let registration;
  try {
    registration=await workers.getRegistration();
    if (!registration && navigator.onLine) {
      const response=await fetch(workerUrl,{method:'HEAD',cache:'no-store'});
      if (response.ok && /javascript/.test(response.headers.get('content-type')||'')) {
        registration=await workers.register(workerUrl,{updateViaCache:'none'});
      }
    }
  } catch {return;}
  if (!registration) return;

  let checkedAt=0;
  const checkForUpdate=()=>{
    if (!navigator.onLine || Date.now()-checkedAt<30000) return;
    checkedAt=Date.now();
    registration.update().catch(()=>{});
  };
  checkForUpdate();
  window.addEventListener('online',checkForUpdate);
  document.addEventListener('visibilitychange',()=>{
    if (document.visibilityState==='visible') checkForUpdate();
  });
}
