// MissAV resource module for Forward
WidgetMetadata={id:"missav.resource",title:"MissAV 播放源",icon:"https://missav.live/favicon.ico",version:"1.0.1",requiredVersion:"0.0.1",description:"MissAV MP4/HLS 播放源",author:"Forward Widgets",site:"https://missav.live",modules:[{id:"loadResource",title:"加载资源",functionName:"loadResource",type:"stream",cacheDuration:0,params:[]}]};
var BASE="https://missav.live",UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
function html(r){return typeof r?.data==="string"?r.data:(r?.body||"")}
function abs(u){u=String(u||"").replace(/\\u002F/g,"/").replace(/\\\//g,"/").replace(/&amp;/g,"&");if(u.startsWith("//"))return "https:"+u;if(u.startsWith("/"))return BASE+u;return u}
function media(s){let a=[],re=/(?:https?:)?\/\/[^"'<>\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\s]*)?/gi,m;while((m=re.exec(s||"")))a.push(abs(m[0]));return [...new Set(a)]}
function title(s){return String(s||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
async function loadResource(p){p=p||{};let u=String(p.url||p.link||p.id||"");if(!u)return[];if(!/^https?:/i.test(u))u=BASE+(u.startsWith("/")?u:"/cn/"+u);try{let r=await Widget.http.get(u,{headers:{"User-Agent":UA,Referer:BASE+"/cn"},timeout:15000}),h=html(r),xs=media(h);return xs.map((x,i)=>({name:"MissAV"+(i?" · 备用":""),description:title(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||u),url:x,customHeaders:{"User-Agent":UA,Referer:u},playerType:"app"}))}catch(e){return[]}}
