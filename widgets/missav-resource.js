// MissAV resource module for Forward
WidgetMetadata={id:"hyj1817.missav.resource",title:"MissAV 播放源",icon:"https://missav.fans/favicon.ico",version:"1.1.0",requiredVersion:"0.0.1",description:"MissAV HLS/MP4 播放源",author:"Forward Widgets",site:"https://missav.fans",globalParams:[{name:"multiSource",title:"是否启用聚合搜索",type:"enumeration",value:"enabled",enumOptions:[{title:"启用",value:"enabled"},{title:"禁用",value:"disabled"}]}],modules:[{id:"loadResource",title:"加载资源",functionName:"loadResource",type:"stream",cacheDuration:0,params:[]}]};
var BASE="https://missav.fans",UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
function clean(s){return String(s||"").replace(/&amp;/g,"&").replace(/\\u002F/g,"/").replace(/\\\//g,"/")}
function abs(s){s=clean(s);if(s.indexOf("//")==0)return "https:"+s;if(s.indexOf("/")==0)return BASE+s;return s}
function getBody(r){return typeof r?.data==="string"?r.data:(r?.body||"")}
function unpack(html){
  var m=String(html||"").match(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
  if(!m)return "";
  var radix=+m[2],count=+m[3],words=m[4].split("|"),out=m[1];
  for(var i=count-1;i>=0;i--)out=out.replace(new RegExp("\\b"+i.toString(radix)+"\\b","g"),words[i]||i.toString(radix));
  return out
}
function collect(text,out){
  text=clean(text);
  var re=/https?:[^"'<>\\\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi,m;
  while((m=re.exec(text))){var u=abs(m[0]);if(out.indexOf(u)<0)out.push(u)}
  return out
}
function extract(html){
  var out=[],m,re=/<(?:video|source)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  while((m=re.exec(String(html||"")))){var u=abs(m[1]);if(/^https?:/i.test(u)&&(/\.m3u8(?:[?#]|$)/i.test(u)||/\.mp4(?:[?#]|$)/i.test(u)))out.push(u)}
  collect(String(html||""),out);
  var scripts=String(html||"").match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi)||[];
  for(var i=0;i<scripts.length;i++){var packed=unpack(scripts[i]);if(packed)collect(packed,out)}
  return out.filter(function(u,i,a){return a.indexOf(u)===i})
}
function makeUrl(p){var s=String(p||"").replace(/^missav:/i,"");if(/^https?:/i.test(s))return s;if(s.indexOf("/")===0)return BASE+s;return BASE+"/"+s}
async function loadResource(params){params=params||{};if(params.multiSource==="disabled")return[];var page=makeUrl(params.link||params.url||params.id);if(!page)return[];try{var r=await Widget.http.get(page,{headers:{"User-Agent":UA,Referer:BASE+"/cn"},timeout:15000});var h=getBody(r),urls=extract(h);return urls.map(function(u,i){return {name:"MissAV"+(i?" · 备用":""),description:/\.m3u8/i.test(u)?"HLS":"MP4",url:u,customHeaders:{"User-Agent":UA,Referer:BASE+"/cn"},playerType:"app"}})}catch(e){return[]}}
