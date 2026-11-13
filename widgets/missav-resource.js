// MissAV resource module for Forward
WidgetMetadata={id:"hyj1817.missav.resource",title:"MissAV 播放源",icon:"https://missav.fans/favicon.ico",version:"1.2.1",requiredVersion:"0.0.1",description:"MissAV HLS/MP4 播放源：提取后并发测速、剔除广告与死链、按快慢排序并缓存",author:"Forward Widgets",site:"https://missav.fans",globalParams:[{name:"multiSource",title:"是否启用聚合搜索",type:"enumeration",value:"enabled",enumOptions:[{title:"启用",value:"enabled"},{title:"禁用",value:"disabled"}]},{name:"probing",title:"播放前测速",type:"enumeration",value:"on",enumOptions:[{title:"开启（慢 1~2 秒，但只留下能播的线路）",value:"on"},{title:"关闭（直接按页面顺序返回）",value:"off"}]}],modules:[{id:"loadResource",title:"加载资源",functionName:"loadResource",type:"stream",cacheDuration:0,params:[]}]};

var BASE = "https://missav.fans";
var UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
var CACHE = {};
var CACHE_TTL = 10 * 60 * 1000;

/* 广告、统计、占位图这类域名里的 m3u8/mp4 一律不要：返回给播放器只会让它先试一条死路 */
var JUNK_HOST = /(?:doubleclick|googlesyndication|googleadservices|adsystem|exoclick|juicyads|popads|popcash|propellerads|adservice|banner|analytics|via\.placeholder|placehold)/i;
/* MissAV 真正的媒体源：这些域名优先 */
var MEDIA_HOST = /(?:surrit|mrstcdn|missav|mushroomtrack|fourhoi)/i;

function clean(s){return String(s||"").replace(/&amp;/g,"&").replace(/\\u002F/g,"/").replace(/\\\//g,"/")}
function abs(s){s=clean(s);if(s.indexOf("//")==0)return "https:"+s;if(s.indexOf("/")==0)return BASE+s;return s}
function getBody(r){return typeof r?.data==="string"?r.data:(r?.body||"")}
function hostOf(u){var m=/^https?:\/\/([^/?#]+)/i.exec(String(u||""));return m?m[1].toLowerCase():""}
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
  return out.filter(function(u,i,a){return a.indexOf(u)===i});
}
function makeUrl(p){var s=String(p||"").replace(/^missav:/i,"");if(/^https?:/i.test(s))return s;if(s.indexOf("/")===0)return BASE+s;return BASE+"/"+s}

/** 只留可能播的：剔除广告域、去重、HLS 优先、媒体域优先 */
function rankCandidates(urls){
  var seen={},list=[];
  for(var i=0;i<urls.length;i++){
    var u=urls[i],host=hostOf(u);
    if(!u||seen[u]||JUNK_HOST.test(host))continue;
    seen[u]=true;
    var hls=/\.m3u8(?:[?#]|$)/i.test(u)||/\/hls\//i.test(u);
    var score=(hls?4:0)+(MEDIA_HOST.test(host)?2:0);
    list.push({url:u,host:host,hls:hls,score:score});
  }
  list.sort(function(a,b){return b.score-a.score});
  return list;
}

/** 并发探一次首字节；m3u8 还要求真的以 #EXTM3U 开头，避免把死链/广告页当成线路 */
async function probe(candidate,headers,timeoutMs){
  var started=Date.now();
  try{
    var response=await Widget.http.get(candidate.url,{headers:headers,timeout:timeoutMs||3000});
    var text=getBody(response);
    var status=Number((response&&(response.status||response.statusCode))||200);
    if(status<200||status>=300)return null;
    if(candidate.hls&&!/#EXTM3U/.test(String(text).slice(0,2048)))return null;
    if(!candidate.hls&&!String(text).length)return null;
    candidate.ms=Date.now()-started;
    candidate.head=String(text).slice(0,2048);
    return candidate;
  }catch(e){return null}
}

/** master 只有一路变体时直接下发变体，省掉播放器启动时的一次往返 */
function singleVariant(candidate){
  if(!candidate.hls||!candidate.head)return "";
  var infos=candidate.head.match(/#EXT-X-STREAM-INF:[^\n]*/g)||[];
  var urls=String(candidate.head).split(/\r?\n/).filter(function(line){return /^https?:\/\//.test(line.trim())});
  if(infos.length!==1||urls.length!==1)return "";
  var name=/NAME="([^"]+)"/.exec(infos[0]);
  if(name)candidate.label=name[1];
  return urls[0].trim();
}

function cached(page){var hit=CACHE[page];return hit&&hit.expires>Date.now()?hit.value:null}
function remember(page,value){
  var keys=Object.keys(CACHE);
  if(keys.length>=32)delete CACHE[keys[0]];
  CACHE[page]={value:value,expires:Date.now()+CACHE_TTL};
  return value;
}

async function loadResource(params){
  params=params||{};
  if(params.multiSource==="disabled")return[];
  var page=makeUrl(params.link||params.url||params.id);
  if(!page)return[];
  // 跟随链接自身的域名（fans / ws / live 用的是同一套页面结构）
  var hostMatch=/^https?:\/\/([^/?#]+)/i.exec(page);
  if(hostMatch)BASE="https://"+hostMatch[1].toLowerCase().replace(/^www\./,"");
  var hit=cached(page);
  if(hit)return hit;
  var headers={"User-Agent":UA,Referer:BASE+"/cn"};
  try{
    var r=await Widget.http.get(page,{headers:headers,timeout:15000});
    var html=getBody(r);
    if(!html||String(html).length<500)return[];
    var candidates=rankCandidates(extract(html));
    if(!candidates.length)return[];

    var probing=String(params.probing||"on")!=="off";
    var picked=probing?[]:candidates;
    if(probing){
      var top=candidates.slice(0,6).map(function(c){return probe(c,headers,3500)});
      var done=await Promise.all(top);
      for(var i=0;i<done.length;i++)if(done[i])picked.push(done[i]);
      // 探测全军覆没时退回原始顺序，交给播放器自己重试
      if(!picked.length)picked=candidates.slice(0,3);
      picked.sort(function(a,b){return (a.ms||99999)-(b.ms||99999)});
    }

    var output=[];
    for(var j=0;j<picked.length;j++){
      var c=picked[j];
      if(!c)continue;
      var url=c.url;
      var label="";
      if(probing){
        var variant=singleVariant(c);
        if(variant)url=variant;
        label=c.label?(" · "+c.label):"";
      }
      output.push({
        name:"MissAV"+(j?" · 备用":"")+(probing?" · "+(c.ms||"?")+"ms":"")+label,
        description:c.hls||/\.m3u8/i.test(url)?"HLS":"MP4",
        url:url,
        customHeaders:{"User-Agent":UA,Referer:BASE+"/cn"},
        playerType:"app"
      });
    }
    return remember(page,output);
  }catch(e){
    return [];
  }
}
