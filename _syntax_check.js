
const $ = id => document.getElementById(id);
const MAX_TABS = 8;
let proxyReadyPromise = null;
let tabs = [];
let activeTabId = null;
let tabSequence = 1;
let currentCocoView = "browser";

function setTutoringIdentity(){document.title="Aiden Tutoring";$("favicon").href="/img/tutoring-icon.svg"}
function setCocofantoIdentity(){document.title="Aiden Tutoring";$("favicon").href="/img/tutoring-icon.svg"}
function looksURL(s){return /^https?:\/\//i.test(s)||(!s.includes(" ")&&/\.[a-z]{2,}(?:[\/:?#]|$)/i.test(s))}
function resolveInput(raw){
  const s=(raw||"").trim(); if(!s)return null;
  if(looksURL(s)){
    const target=/^https?:\/\//i.test(s)?s:"https://"+s;
    let title=s; try{title=new URL(target).hostname.replace(/^www\./,"")}catch{}
    return {target,title};
  }
  const preset=localStorage.getItem("cocofantoBrowserPreset")||"duck";
  const providers={chrome:{url:"https://www.google.com/search?q=",title:s+" - Google Search"},edge:{url:"https://www.bing.com/search?q=",title:s+" - Bing"},duck:{url:"https://duckduckgo.com/?q=",title:s+" at DuckDuckGo"}};
  const p=providers[preset]||providers.duck;
  return {target:p.url+encodeURIComponent(s),title:p.title};
}
function cleanTitle(s){s=(s||"").replace(/\s+/g," ").trim();return s.length>42?s.slice(0,39)+"…":s}
function activeTab(){return tabs.find(t=>t.id===activeTabId)||null}
function makeTab(data={}){return {id:data.id||tabSequence++,title:data.title||"New Tab",target:data.target||"",loading:false,frame:null,framePromise:null,lastActive:Date.now(),hibernated:!!data.target}}

function createTab(activate=true,data={}){
  if(tabs.length>=MAX_TABS){alert("Cocofanto supports up to "+MAX_TABS+" tabs at once.");return null}
  const tab=makeTab(data);tabs.push(tab);if(activate)activateTab(tab.id);else renderTabs();persistTabs();return tab;
}
function closeTab(id,event){if(event)event.stopPropagation();const i=tabs.findIndex(t=>t.id===id);if(i<0)return;const wasActive=activeTabId===id;destroyTabFrame(tabs[i]);tabs.splice(i,1);if(!tabs.length){const t=makeTab();tabs.push(t);activeTabId=t.id}else if(wasActive){activeTabId=tabs[Math.min(i,tabs.length-1)].id}renderTabs();syncActiveUI();const t=activeTab();if(t&&t.target)ensureTabFrame(t);persistTabs();enforceLiveLimit()}
function activateTab(id){const tab=tabs.find(t=>t.id===id);if(!tab)return;activeTabId=id;tab.lastActive=Date.now();renderTabs();syncActiveUI();if(tab.target)ensureTabFrame(tab);persistTabs();enforceLiveLimit()}
function renderTabs(){const strip=$("tabStrip");strip.textContent="";for(const tab of tabs){const el=document.createElement("div");el.className="browser-tab"+(tab.id===activeTabId?" active":"")+(tab.loading?" loading":"");el.dataset.id=tab.id;el.title=tab.title;el.innerHTML='<span class="tab-status"></span><span class="tab-title"></span><button class="tab-close" title="Close tab" aria-label="Close tab">×</button>';el.querySelector(".tab-title").textContent=cleanTitle(tab.title)||"New Tab";el.onclick=()=>activateTab(tab.id);el.onauxclick=e=>{if(e.button===1)closeTab(tab.id,e)};el.querySelector(".tab-close").onclick=e=>closeTab(tab.id,e);strip.appendChild(el)}const activeEl=strip.querySelector(".browser-tab.active");activeEl?.scrollIntoView({block:"nearest",inline:"nearest"})}

function setActiveLoading(loading){const tab=activeTab();if(tab)tab.loading=loading;$("browserProgress").classList.toggle("loading",!!loading);$("addressShell").classList.toggle("loading",!!loading);$("loadNote").classList.toggle("show",!!loading);renderTabs()}
function syncActiveUI(){const tab=activeTab();if(!tab)return;for(const t of tabs){if(t.frame)t.frame.classList.toggle("active",t.id===activeTabId)}$("newTabPage").classList.toggle("hidden",!!tab.target);$("addressInput").value=tab.target||"";$("browserProgress").classList.toggle("loading",!!tab.loading);$("addressShell").classList.toggle("loading",!!tab.loading);$("loadNote").classList.toggle("show",!!tab.loading);renderTabs();if(!tab.target)requestAnimationFrame(()=>$("newTabQ").focus({preventScroll:true}))}

async function ensureTabFrame(tab){
  if(tab.frame){for(const t of tabs){if(t.frame)t.frame.classList.toggle("active",t.id===activeTabId)}return tab.frame}
  if(tab.framePromise)return tab.framePromise;
  if(!tab.target)return null;
  tab.loading=true;if(tab.id===activeTabId)setActiveLoading(true);else renderTabs();
  tab.framePromise=(async()=>{
    try{
      const config=await ensureProxyReady();
      if(tab.frame)return tab.frame;
      const frame=document.createElement("iframe");
      frame.className="browser-frame"+(tab.id===activeTabId?" active":"");
      frame.title=tab.title;
      frame.setAttribute("allow","autoplay; fullscreen; clipboard-read; clipboard-write");
      frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
      frame.setAttribute("loading","eager");
      frame.setAttribute("fetchpriority","high");
      frame.addEventListener("load",()=>{tab.loading=false;tab.hibernated=false;syncTabFromFrame(tab);if(tab.id===activeTabId)syncActiveUI();else renderTabs();persistTabs();enforceLiveLimit()});
      // Set the real URL before insertion so the browser does not first create an unnecessary about:blank navigation.
      frame.src=config.prefix+config.encodeUrl(tab.target);
      tab.frame=frame;
      $("frameHost").appendChild(frame);
      tab.hibernated=false;
      return frame;
    }catch(err){
      tab.loading=false;if(tab.id===activeTabId)setActiveLoading(false);
      console.error("Cocofanto navigation failed:",err);
      alert("Cocofanto could not start the existing web service. Check the console.");
      return null;
    }finally{tab.framePromise=null}
  })();
  return tab.framePromise;
}
function destroyTabFrame(tab){if(!tab)return;tab.framePromise=null;if(!tab.frame)return;syncTabFromFrame(tab);try{tab.frame.src="about:blank"}catch{}tab.frame.remove();tab.frame=null;tab.hibernated=!!tab.target;tab.loading=false}
function syncTabFromFrame(tab){if(!tab?.frame)return;try{const title=tab.frame.contentDocument?.title?.trim();if(title&&title!=="Aiden Tutoring")tab.title=title}catch{}try{const href=tab.frame.contentWindow.location.href;const decoded=decodeProxyHref(href);if(decoded)tab.target=decoded}catch{}if(tab.id===activeTabId)$("addressInput").value=tab.target||""}
function decodeProxyHref(href){try{const u=new URL(href,location.href);const cfg=window.__uv$config;if(!cfg||!u.pathname.startsWith(cfg.prefix))return "";const encoded=u.pathname.slice(cfg.prefix.length);return cfg.decodeUrl(encoded)}catch{return ""}}
function getLiveTabLimit(){const saved=Number(localStorage.getItem("cocofantoLiveTabs"));if([2,4,6].includes(saved))return saved;return document.documentElement.classList.contains("low-power")?2:4}
function enforceLiveLimit(){const limit=getLiveTabLimit();let live=tabs.filter(t=>t.frame);if(live.length<=limit)return;const victims=live.filter(t=>t.id!==activeTabId).sort((a,b)=>a.lastActive-b.lastActive);while(live.length>limit&&victims.length){destroyTabFrame(victims.shift());live=tabs.filter(t=>t.frame)}renderTabs();persistTabs()}

async function navigateTab(tab,input){
  const resolved=typeof input==="string"?resolveInput(input):input;if(!tab||!resolved)return;
  tab.target=resolved.target;tab.title=resolved.title||"Loading…";tab.lastActive=Date.now();tab.loading=true;
  sessionStorage.setItem("cocofantoLastTarget",tab.target);persistTabs();syncActiveUI();
  try{
    const config=await ensureProxyReady();
    const nextSrc=config.prefix+config.encodeUrl(tab.target);
    if(tab.frame){
      // Reuse the existing browsing context. This avoids tearing down/recreating the iframe and its page context on every search/address navigation.
      tab.frame.title=tab.title;
      tab.frame.src=nextSrc;
      tab.hibernated=false;
      if(tab.id===activeTabId)setActiveLoading(true);else renderTabs();
      return;
    }
    await ensureTabFrame(tab);
  }catch(err){tab.loading=false;if(tab.id===activeTabId)setActiveLoading(false);console.error("Cocofanto navigation failed:",err)}
}
function navigateAddress(){navigateTab(activeTab(),$("addressInput").value)}
function goNewTab(){navigateTab(activeTab(),$("newTabQ").value)}
function openInActiveTab(url){navigateTab(activeTab(),{target:url,title:(()=>{try{return new URL(url).hostname.replace(/^www\./,"")}catch{return url}})()})}
function blankActiveTab(){const tab=activeTab();if(!tab)return;destroyTabFrame(tab);tab.target="";tab.title="New Tab";tab.hibernated=false;persistTabs();syncActiveUI()}
function reloadActiveTab(){const tab=activeTab();if(!tab||!tab.target)return;if(!tab.frame){ensureTabFrame(tab);return}tab.loading=true;setActiveLoading(true);try{tab.frame.contentWindow.location.reload()}catch{ensureProxyReady().then(config=>{tab.frame.src=config.prefix+config.encodeUrl(tab.target)}).catch(()=>{tab.loading=false;setActiveLoading(false)})}}
function tabHistory(delta){const tab=activeTab();if(!tab?.frame)return;tab.loading=true;setActiveLoading(true);try{tab.frame.contentWindow.history.go(delta);setTimeout(()=>syncTabFromFrame(tab),350)}catch{tab.loading=false;setActiveLoading(false)}}

function persistTabs(){try{sessionStorage.setItem("cocofantoTabsV6",JSON.stringify(tabs.map(t=>({id:t.id,title:t.title,target:t.target}))));sessionStorage.setItem("cocofantoActiveTabV6",String(activeTabId||""))}catch{}}
function restoreTabs(){try{const raw=JSON.parse(sessionStorage.getItem("cocofantoTabsV6")||"[]");if(Array.isArray(raw)&&raw.length){tabs=raw.slice(0,MAX_TABS).map(x=>makeTab(x));tabSequence=Math.max(...tabs.map(t=>Number(t.id)||0),0)+1;const savedId=Number(sessionStorage.getItem("cocofantoActiveTabV6"));activeTabId=tabs.some(t=>t.id===savedId)?savedId:tabs[0].id;renderTabs();syncActiveUI();return}}catch{}const t=makeTab();tabs=[t];activeTabId=t.id;renderTabs();syncActiveUI()}

function waitForUvConfig(timeoutMs=5000){if(window.__uv$config)return Promise.resolve(window.__uv$config);return new Promise((resolve,reject)=>{const start=performance.now();(function check(){if(window.__uv$config)return resolve(window.__uv$config);if(performance.now()-start>timeoutMs)return reject(new Error("Ultraviolet config did not load."));requestAnimationFrame(check)})()})}
async function ensureProxyReady(){
  if(proxyReadyPromise)return proxyReadyPromise;
  proxyReadyPromise=(async()=>{
    if(!("serviceWorker" in navigator))throw new Error("Service workers are unavailable.");
    const config=await waitForUvConfig();
    let registration=await navigator.serviceWorker.getRegistration(config.prefix);
    if(!registration)registration=await navigator.serviceWorker.register("/sw.js",{scope:config.prefix,updateViaCache:"imports"});
    if(registration.active)return config;
    const worker=registration.installing||registration.waiting;
    if(!worker)return config;
    if(worker.state==="activated")return config;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Service worker activation timed out.")),6500);
      worker.addEventListener("statechange",()=>{
        if(worker.state==="activated"){clearTimeout(timer);resolve()}
        else if(worker.state==="redundant"){clearTimeout(timer);reject(new Error("Service worker became redundant."))}
      });
    });
    return config;
  })().catch(err=>{proxyReadyPromise=null;throw err});
  return proxyReadyPromise;
}

function showCocoView(view){currentCocoView=view;$("cocoBrowserPanel").classList.toggle("active",view==="browser");$("cocoSettingsPanel").classList.toggle("active",view==="settings");$("cocoGamePanel").classList.toggle("active",view==="game");if(view!=="game")unloadGeometryDash();if(view==="browser")syncActiveUI()}
function showCocoHome(){showCocoView("browser")}
function showCocoSettings(){showCocoView("settings")}
function showCocoGame(){showCocoView("game");const frame=$("geometryDashFrame"),loading=$("geometryDashLoading");loading.classList.remove("hidden-load");if(!frame.dataset.gameLoaded){frame.dataset.gameLoaded="1";frame.src="https://geometrydash-lite.io/"}}
function geometryDashLoaded(){const frame=$("geometryDashFrame");if(frame&&frame.dataset.gameLoaded)$("geometryDashLoading").classList.add("hidden-load")}
function unloadGeometryDash(){const frame=$("geometryDashFrame");if(!frame||!frame.dataset.gameLoaded)return;frame.src="about:blank";delete frame.dataset.gameLoaded;$("geometryDashLoading").classList.remove("hidden-load")}
async function toggleGameFullscreen(){const shell=$("geometryDashShell");try{if(!document.fullscreenElement)await shell.requestFullscreen();else await document.exitFullscreen()}catch(err){console.error(err)}}
async function toggleBrowserFullscreen(){try{if(!document.fullscreenElement)await $("cocofanto").requestFullscreen();else await document.exitFullscreen()}catch(err){console.error(err)}}

function openCocofanto(addHistory=true){sessionStorage.setItem("cocofantoView","1");setCocofantoIdentity();if(addHistory&&location.hash!=="#cocofanto")history.pushState({view:"cocofanto"},"","#cocofanto");$("tutoring").classList.add("hidden");$("cocofanto").classList.remove("hidden");showCocoView("browser");window.scrollTo(0,0);ensureProxyReady().catch(()=>{});const t=activeTab();if(t?.target)ensureTabFrame(t)}
function continueToCocofanto(){const value=$("contactEmail").value.trim();if(!value){alert("Please enter your email address first.");return}openCocofanto()}
function backToTutoring(){sessionStorage.removeItem("cocofantoView");setTutoringIdentity();history.pushState({view:"tutoring"},"",location.pathname+location.search);$("cocofanto").classList.add("hidden");$("tutoring").classList.remove("hidden");window.scrollTo(0,0)}
function showCocofantoFromHistory(){sessionStorage.setItem("cocofantoView","1");$("tutoring").classList.add("hidden");$("cocofanto").classList.remove("hidden");showCocoView("browser");setCocofantoIdentity();const t=activeTab();if(t?.target)ensureTabFrame(t)}
function showTutoringFromHistory(){sessionStorage.removeItem("cocofantoView");$("cocofanto").classList.add("hidden");$("tutoring").classList.remove("hidden");setTutoringIdentity();window.scrollTo(0,0)}
window.addEventListener("popstate",()=>{if(location.hash==="#cocofanto")showCocofantoFromHistory();else showTutoringFromHistory()});

function saveBrowserPreset(){localStorage.setItem("cocofantoBrowserPreset",$("browserPreset").value);updateSettingsLabels()}
function saveLiveTabLimit(){localStorage.setItem("cocofantoLiveTabs",$("liveTabLimit").value);updateSettingsLabels();enforceLiveLimit()}
function saveBackKey(){localStorage.setItem("cocofantoBackKey",$("backKey").value);updateSettingsLabels()}
function updateSettingsLabels(){const preset=localStorage.getItem("cocofantoBrowserPreset")||"duck";const names={chrome:"Google",edge:"Bing",duck:"DuckDuckGo"};$("browserPreset").value=preset;$("browserLabel").textContent="Search: "+(names[preset]||names.duck);const limit=getLiveTabLimit();$("liveTabLimit").value=String(limit);$("tabLimitLabel").textContent="Live tabs: "+limit;const key=localStorage.getItem("cocofantoBackKey")||"Escape";$("backKey").value=key;$("keyLabel").textContent="Return: "+(key==="Escape"?"Esc":key)}

window.addEventListener("keydown",e=>{
  const cocoOpen=!$("cocofanto").classList.contains("hidden");if(!cocoOpen)return;
  const tag=(e.target?.tagName||"").toLowerCase();const typing=tag==="input"||tag==="textarea"||tag==="select"||e.target?.isContentEditable;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="l"){e.preventDefault();showCocoView("browser");$("addressInput").focus();$("addressInput").select();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="t"){e.preventDefault();showCocoView("browser");createTab(true);return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="w"){e.preventDefault();closeTab(activeTabId);return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="r"){e.preventDefault();reloadActiveTab();return}
  if(e.altKey&&e.key==="ArrowLeft"){e.preventDefault();tabHistory(-1);return}
  if(e.altKey&&e.key==="ArrowRight"){e.preventDefault();tabHistory(1);return}
  const backKey=localStorage.getItem("cocofantoBackKey")||"Escape";if(!typing&&e.key===backKey){e.preventDefault();backToTutoring()}
});

document.addEventListener("visibilitychange",()=>{if(document.hidden){for(const t of tabs)syncTabFromFrame(t);persistTabs()}});
window.addEventListener("beforeunload",()=>{for(const t of tabs)syncTabFromFrame(t);persistTabs()});

if((navigator.hardwareConcurrency||8)<=4)document.documentElement.classList.add("low-power");
restoreTabs();updateSettingsLabels();
// Robust search bindings for the new-tab and upper address bars.
$("newTabQ")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();goNewTab()}});
$("addressInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();navigateAddress()}});
// Start the service worker immediately so the first navigation does not pay the setup cost.
ensureProxyReady().catch(()=>{});
if(location.hash==="#cocofanto"||sessionStorage.getItem("cocofantoView")==="1"){
  if(location.hash!=="#cocofanto")history.replaceState({view:"cocofanto"},"","#cocofanto");showCocofantoFromHistory();
}else{history.replaceState({view:"tutoring"},"",location.pathname+location.search);showTutoringFromHistory()}
