const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT="/tmp/fwm2";
const jsdom=require("jsdom"),JQ=fs.readFileSync("/tmp/fwm2/node_modules/jquery/dist/jquery.js","utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
function load(file,responses){
  const requested=[];
  const ctx={console:{log(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
   Widget:{http:{get:async(u,o={})=>{requested.push({url:u,headers:o.headers||{}});
     const hit=Object.keys(responses||{}).find(k=>u.indexOf(k)>=0);return {data:hit?responses[hit]:({length:1})&&"x",status:200};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets",file),"utf8"),ctx,{filename:file});
  ctx.__requested=requested;return ctx;
}
const LIST='<html><body><div class="thumbnail"><a href="/dm265/cn/abc-123"><img src="https://fourhoi.com/x.jpg" alt="测试片"></a></div></body></html>'.padEnd(12000," ");
(async()=>{
  const h=load("missav.js",{"/dm265/cn/chinese-subtitle":LIST});
  await h.loadChineseSubtitle({page:"1",site:"ws"});
  const asked=h.__requested.filter(x=>/chinese-subtitle/.test(x.url));
  assert.ok(/^https:\/\/missav\.ws\//.test(asked[0].url), "首个请求应发往 missav.ws: "+asked[0].url);
  assert.ok(/missav\.ws/.test(asked[0].headers.Referer||""), "Referer 也应跟随站点: "+asked[0].headers.Referer);

  const h2=load("missav.js",{"/dm265/cn/chinese-subtitle":LIST});
  await h2.loadChineseSubtitle({page:"1",site:"custom",custom_site:"https://missav.live/"});
  const asked2=h2.__requested.filter(x=>/chinese-subtitle/.test(x.url));
  assert.ok(/^https:\/\/missav\.live\//.test(asked2[0].url), "自定义站点应生效: "+asked2[0].url);

  const res=load("missav-resource.js",{"/dm265/cn/abc-123":'<html>'.padEnd(2000," ")+'<script>var u="https://surrit.com/x/playlist.m3u8";</script>'});
  res.Widget.http.get=async(u)=>({data:'#EXTM3U\nhttps://surrit.com/x/v.m3u8\n',status:200});
  const out=await res.loadResource({link:"https://missav.ws/dm265/cn/abc-123",probing:"off"});
  assert.ok(Array.isArray(out));
  console.log("missav site-switch tests passed");
})().catch(e=>{console.error(e);process.exit(1)});
