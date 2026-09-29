WidgetMetadata={id:"hyj1817.hentaimama.resource",title:"Hentaimama 播放源",icon:"https://hentaimama.io/wp-content/themes/dooplay/assets/img/favicon.png",version:"1.3.1",requiredVersion:"0.0.2",description:"Hentaimama HLS/MP4 播放源",author:"Forward Widgets",site:"https://hentaimama.io",globalParams:[{name:"multiSource",title:"是否启用聚合搜索",type:"enumeration",value:"enabled",enumOptions:[{title:"启用",value:"enabled"},{title:"禁用",value:"disabled"}]}],modules:[{id:"loadResource",title:"加载资源",functionName:"loadResource",type:"stream",cacheDuration:0,params:[]}]};
var B="https://hentaimama.io",U="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
function full(s){s=String(s||"");return s.indexOf("http")===0?s:B+"/"+s.replace(/^\//,"")}
function body(r){return typeof r?.data==="string"?r.data:(r?.body||"")}
function abs(s){s=String(s||"").replace(/&#038;/g,"&").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;|&#39;/g,"'");if(s.indexOf("//")===0)return "https:"+s;if(s.charAt(0)==="/")return B+s;return s}
function nameFrom(p){var v=[p&&p.link,p&&p.url,p&&p.id,p&&p.seriesName,p&&p.title].filter(Boolean).map(String)[0]||"";v=v.replace(/^hentaimama:/i,"").replace(/^https?:\/\/[^/]+\/tvshows\//i,"").replace(/^https?:\/\/[^/]+\/episodes\//i,"").replace(/\/$/,"");return decodeURIComponent(v).replace(/[-_]+/g," ").trim()}
async function get(u,ref){for(var i=0;i<3;i++){try{var r=await Widget.http.get(u,{headers:{"User-Agent":U,Accept:"text/html,application/xhtml+xml,*/*",Referer:ref||B+"/"},timeout:15000});return body(r)}catch(e){if(i===2)throw e;await new Promise(function(res){setTimeout(res,1200)})}}}
async function postPlayer(pid,idx,ref){var r=await Widget.http.post(B+"/wp-admin/admin-ajax.php","action=get_player_contents&a="+pid+"&i="+idx,{headers:{"User-Agent":U,"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",Accept:"application/json, text/javascript, */*; q=0.01","X-Requested-With":"XMLHttpRequest",Origin:B,Referer:ref||B+"/"},timeout:15000});return body(r)}
function iframeSrc(payload){var html="";try{var arr=JSON.parse(String(payload||""));if(Array.isArray(arr))html=arr.filter(function(x){return typeof x==="string"&&x.indexOf("<iframe")>=0})[0]||arr.filter(function(x){return typeof x==="string"&&x.indexOf("src=")>=0})[0]||"";else html=String(arr)}catch(e){html=String(payload||"")}var m=String(html).match(/src=["']([^"']+)["']/i);return m?abs(m[1]):""}
function sources(page){var out=[],m,re=/"file"\s*:\s*"([^"]+)"/g,raw=String(page||"").replace(/\\\//g,"/");while((m=re.exec(raw))){var u=abs(m[1].replace(/\\u002F/g,"/").replace(/&amp;/g,"&"));if(/\.m3u8(?:[?#]|$)|\.mp4(?:[?#]|$)/i.test(u)&&out.indexOf(u)<0)out.push(u)}if(!out.length){var alt=raw.match(/https?:[^"'<>\\\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi)||[];for(var i=0;i<alt.length;i++){var v=abs(alt[i]);if(out.indexOf(v)<0)out.push(v)}}return out}
function episodeLinks(html){var out=[],m,re=/href=["']([^"']*\/episodes\/[^"']+)["']/gi;while((m=re.exec(String(html||"")))){var u=abs(m[1]);if(out.indexOf(u)<0)out.push(u)}return out}
function pickEpisode(links,episode){var ep=parseInt(episode,10);if(ep){var want=new RegExp("episode-"+ep+"(?:[/?#]|$)","i");for(var i=0;i<links.length;i++)if(want.test(links[i]))return links[i]}return links[0]}
function label(u,type){return type==="m3u8"?"HLS":(u.match(/\/(\d{3,4}p)\//i)||[])[1]?((u.match(/\/(\d{3,4}p)\//i)||[])[1]+" MP4").toUpperCase():"MP4"}
async function resolveEpisode(epUrl){
  var page=await get(epUrl,B+"/");
  var m=String(page).match(/data-post=["']?(\d+)/i)||String(page).match(/"episode"\s*:\s*"?(\d+)/);
  if(!m)return[];
  var pid=m[1],opts=[],o,re=/href=["']#option-(\d+)["']/gi;
  while((o=re.exec(String(page))))if(opts.indexOf(+o[1])<0)opts.push(+o[1]);
  if(!opts.length)opts=[1];
  if(opts.length>4)opts=opts.slice(0,4);
  var out=[];
  for(var i=0;i<opts.length;i++){
    var payload=await postPlayer(pid,opts[i],epUrl);
    var src=iframeSrc(payload);
    if(!src)continue;
    var wrapper=await get(src,epUrl);
    var urls=sources(wrapper);
    for(var j=0;j<urls.length;j++){
      if(out.some(function(x){return x.url===urls[j]}))continue;
      out.push({name:"Hentaimama · 线路"+(out.length+1)+(urls.length>1?" · "+label(urls[j],/\.m3u8/i.test(urls[j])?"m3u8":"mp4"):""),description:/\.m3u8/i.test(urls[j])?"HLS":"MP4",url:urls[j],customHeaders:{"User-Agent":U,Referer:epUrl},playerType:"app"});
    }
    if(out.length>=6)break;
  }
  return out
}
async function loadResource(p){try{
  p=p||{};
  if(p.multiSource==="disabled")return[];
  var raw=String(p.link||p.url||p.id||"").replace(/^hentaimama:/i,"").replace(/^https?:\/\/[^/]+/i,"");
  var epUrl="";
  if(/(?:^|\/)episodes\//.test(raw))epUrl=full(raw);
  else{
    var show="";
    if(/(?:^|\/)tvshows\//.test(raw))show=full(raw);
    else{
      var q=nameFrom(p).replace(/\s+/g," ");
      if(q){var sh=await get(B+"/?s="+encodeURIComponent(q),B+"/");var m=sh.match(/href=["']([^"']*\/tvshows\/[^"']+)["']/i);if(m)show=abs(m[1])}
    }
    if(!show)return[];
    var showPage=await get(show,B+"/");
    var links=episodeLinks(showPage);
    if(!links.length)return[];
    epUrl=pickEpisode(links,p.episode);
  }
  if(!epUrl)return[];
  return await resolveEpisode(epUrl)
}catch(e){console.log("Hentaimama resolve: "+e.message);return[]}}
