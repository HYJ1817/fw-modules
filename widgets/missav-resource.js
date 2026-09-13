// MissAV resource module for Forward
WidgetMetadata={id:"hyj1817.missav.resource",title:"MissAV 播放源",icon:"https://missav.live/favicon.ico",version:"1.0.3",requiredVersion:"0.0.1",description:"MissAV HLS/MP4 播放源",author:"Forward Widgets",site:"https://missav.live",modules:[{id:"loadResource",title:"加载资源",functionName:"loadResource",type:"stream",params:[]}]};
var BASE="https://missav.live",UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
function clean(s){return String(s||"").replace(/&amp;/g,"&").replace(/\\u002F/g,"/").replace(/\\\//g,"/")}
function abs(s){s=clean(s);if(s.indexOf("//")==0)return "https:"+s;if(s.indexOf("/")==0)return BASE+s;return s}
function getBody(r){return typeof r?.data==="string"?r.data:(r?.body||"")}
function extract(html){var out=[],m,re=/<(?:video|source)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;while((m=re.exec(html||""))){var u=abs(m[1]);if(/^https?:/i.test(u)&&(/\.m3u8(?:[?#]|$)/i.test(u)||/\.mp4(?:[?#]|$)/i.test(u)))out.push(u)}var raw=String(html||"").match(/https?:[^"'<>\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\s]*)?/gi)||[];out=out.concat(raw.map(abs));return out.filter(function(u,i,a){return a.indexOf(u)===i})}
function makeUrl(p){var s=String(p||"").replace(/^missav:/i,"");if(/^https?:/i.test(s))return s;if(s.indexOf("/")===0)return BASE+s;return BASE+"/"+s}
async function loadResource(params){params=params||{};var page=makeUrl(params.link||params.url||params.id);if(!page)return[];try{var r=await Widget.http.get(page,{headers:{"User-Agent":UA,Referer:BASE+"/cn"},timeout:15000});var h=getBody(r),urls=extract(h);return urls.map(function(u,i){return {name:"MissAV"+(i?" · 备用":""),description:"MissAV - "+page.split("/").pop(),url:u}})}catch(e){return[]}}
