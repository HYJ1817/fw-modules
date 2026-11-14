/**
 * Jable（nibiru 版，规范化后）单测：元信息、站点切换、列表解析、详情取流、失败兜底
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const jsdom=require("jsdom"),JQ=fs.readFileSync(path.join(ROOT,"node_modules/jquery/dist/jquery.js"),"utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
const LIST=`<html><body><div class="site-content"><div class="py-3">
  <div class="video-img-box">
    <div class="img-box"><img data-src="https://jable.tv/c.jpg" data-preview="p.mp4"><div class="absolute-bottom-right"><span class="label">01:23:45</span></div></div>
    <div class="detail"><h6 class="title"><a href="https://jable.tv/videos/abc-123/">ABC-123 测试影片</a></h6></div>
  </div>
</div></div></body></html>`;
const DETAIL=`<html><body><script>var hlsUrl = "https://jable.tv/hls/abc-123/index.m3u8";</script>
<div class="absolute-bottom-right"><span class="label">01:23:45</span></div></body></html>`;
function load(responses){
  const requested=[];
  const ctx={console:{log(){},error(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,URL,
    encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async(u,o={})=>{requested.push({url:u,headers:o.headers||{}});const hit=Object.keys(responses).find(k=>u.indexOf(k)>=0);return {data:hit?responses[hit]:"",status:hit?200:403};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/jable.js"),"utf8"),ctx,{filename:"jable.js"});
  ctx.__requested=requested;return ctx;
}
function testMetadata(){
  const w=load({}),m=w.WidgetMetadata;
  assert.strictEqual(m.id,"hyj1817.jable.home");
  assert.ok(m.modules.length>=10,"分类模块应保留");
  assert.ok(m.modules.every(x=>x.id&&x.type==="video"),"每个模块都要有 id/type");
  assert.ok(m.globalParams.some(p=>p.name==="site"),"应有站点切换参数");
  assert.ok(m.icon&&m.icon.startsWith("https://"));
}
async function testSiteSwitch(){
  const w=load({"/hot/":LIST});
  const out=await w.loadPage({url:"https://jable.tv/hot/?mode=async",page:1,site:"fs1"});
  assert.ok(Array.isArray(out)&&out.length>=1,"应解析出条目");
  assert.ok(/^https:\/\/fs1\.app\//.test(w.__requested[0].url),"请求应发往 fs1.app："+w.__requested[0].url);
  assert.ok(/fs1\.app/.test(w.__requested[0].headers.Referer||w.__requested[0].headers.referer||""),"Referer 应跟随站点");
  assert.ok(/fs1\.app|jable\.tv/.test(out[0].link),"条目链接应是绝对地址");
}
async function testFailure(){
  const w=load({});
  const out=await w.loadPage({url:"https://jable.tv/hot/",page:1});
  assert.ok(Array.isArray(out)&&out.length===1&&/Jable：/.test(out[0].title),"失败应返回提示条目");
}
async function testDetail(){
  const w=load({"/videos/abc-123/":DETAIL});
  const d=await w.loadDetail("https://jable.tv/videos/abc-123/");
  assert.ok(d&&/\.m3u8/.test(d.videoUrl),"详情应返回 m3u8");
  assert.strictEqual(d.playerType,"ijk");
  assert.ok(d.customHeaders&&d.customHeaders.Referer);
}
(async()=>{testMetadata();await testSiteSwitch();await testFailure();await testDetail();console.log("jable tests passed");})().catch(e=>{console.error(e);process.exit(1)});
