/**
 * JAVDay 单测：元信息、栏目入口、搜索地址形态、详情取流（全部用 mock，不依赖外网）
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const jsdom=require("jsdom"),JQ=fs.readFileSync(path.join(ROOT,"node_modules/jquery/dist/jquery.js"),"utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
const LIST='<html><body><div class="video-wrapper">'+
 '<a class="videoBox" href="/videos/ABC123/"><img data-src="https://javday.app/c.jpg"><div class="videoBox-info"><span class="title">ABC-123 测试影片</span></div></a>'+
 '</div></body></html>';
const DETAIL='<html><body><script>var player = {"url":"https://javday.homes/videos/x/index.m3u8"};</script></body></html>';
function load(responses){
  const requested=[];
  const ctx={console:{log(){},error(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,URL,
    encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async(u,o={})=>{requested.push(u);const hit=Object.keys(responses).find(k=>u.indexOf(k)>=0);return {data:hit?responses[hit]:"",status:200};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/javday.js"),"utf8"),ctx,{filename:"javday.js"});
  ctx.__requested=requested;return ctx;
}
function testMetadata(){
  const w=load({}),m=w.WidgetMetadata;
  assert.strictEqual(m.id,"hyj1817.javday.home");
  assert.strictEqual(m.modules.length,10);
  assert.ok(m.modules.every(x=>x.id&&x.type==="video"&&typeof w[x.functionName]==="function"),"每个模块都要有 id/type 和对应函数");
  assert.ok(m.search&&m.search.functionName==="search");
  assert.ok(m.icon.startsWith("https://"));
}
async function testLists(){
  const w=load({"/label/new/":LIST,"/category/uncensored-leaked/":LIST});
  const a=await w.loadJavdayNew({page:"1"});
  const b=await w.loadJavdayLeaked({page:"1"});
  assert.ok(a.length>=1&&b.length>=1);
  assert.ok(/\/label\/new\//.test(w.__requested[0]),"最新应请求 /label/new/");
  assert.ok(w.__requested.some(u=>/\/category\/uncensored-leaked\//.test(u)),"无码流出应请求对应栏目");
}
async function testSearchUrl(){
  const w=load({"/search/":LIST});
  const out=await w.search({keyword:"SSIS",page:"1"});
  assert.ok(out.length>=1);
  assert.ok(/\/search\/SSIS\/$/.test(w.__requested[0]),"搜索应走路径形式："+w.__requested[0]);
}
async function testDetail(){
  const w=load({"/videos/ABC123/":DETAIL});
  const d=await w.loadDetail("https://javday.app/videos/ABC123/");
  assert.ok(d&&/\.m3u8$/.test(d.videoUrl),"详情应返回 m3u8");
  assert.ok(d.customHeaders&&d.customHeaders.Referer,"详情要带 Referer");
}
(async()=>{testMetadata();await testLists();await testSearchUrl();await testDetail();console.log("javday tests passed");})().catch(e=>{console.error(e);process.exit(1)});
