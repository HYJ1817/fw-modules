/**
 * 91Porn 单测：元信息、状态码兼容、列表解析（不依赖外网）
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const jsdom=require("jsdom"),JQ=fs.readFileSync(path.join(ROOT,"node_modules/jquery/dist/jquery.js"),"utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
const LIST=`<html><body><div class="row">
  <div class="col-4"><div class="videos-text-align">
    <a href="https://91porn.com/view_video.php?viewkey=abc123"><img class="img-responsive" src="https://vthumb.killcovid2021.com/thumb/abc123.jpg"></a>
    <span class="video-title">测试标题 91</span>
    <span class="duration">10:24</span>
    <span class="info">添加时间: 2026-01-01</span>
  </div></div>
</div></body></html>`;
function load(responses, statuses){
  const requested=[];
  const ctx={console:{log(){},error(){},warn(){},debug(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,URL,
    encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async(u,o={})=>{requested.push(u);const hit=Object.keys(responses).find(k=>u.indexOf(k)>=0);
      return {data:hit?responses[hit]:"",status:(statuses&&statuses[u])||(hit?200:404)};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/porn91.js"),"utf8"),ctx,{filename:"porn91.js"});
  ctx.__requested=requested;return ctx;
}
function testMetadata(){
  const w=load({}),m=w.WidgetMetadata;
  assert.strictEqual(m.id,"hyj1817.porn91.home");
  assert.strictEqual(m.modules.length,1);
  assert.strictEqual(m.modules[0].type,"video","模块必须带 type");
  assert.strictEqual(typeof w.getList,"function");
  assert.ok(m.icon&&m.icon.startsWith("https://"));
}
async function testList(){
  const w=load({"/v.php":LIST});
  const out=await w.getList({sort_by:"rf",page:"1"});
  assert.ok(Array.isArray(out)&&out.length===1,"应解析出一条");
  assert.strictEqual(out[0].title,"测试标题 91");
  assert.ok(/viewkey=abc123/.test(out[0].link));
  assert.ok(/vthumb/.test(out[0].backdropPath));
  assert.ok(/\/v\.php\?category=rf/.test(w.__requested[0]),"应请求列表接口");
}
async function testStatusCompat(){
  // Forward 的响应只有 status：上游用 statusCode 判断会永远失败，这里验证已兼容
  const w=load({"/v.php":LIST});
  const out=await w.getList({sort_by:"hot",page:"1"});
  assert.ok(out.length===1,"status 形式也应成功");
}
async function testHttpError(){
  const w=load({});
  let out;
  try { out=await w.getList({sort_by:"rf",page:"1"}); } catch (e) { out=null; }
  assert.ok(out===null||Array.isArray(out),"404 时不应崩溃：返回空数组或抛错都可以");
  if(Array.isArray(out)) assert.strictEqual(out.length,0);
}
(async()=>{testMetadata();await testList();await testStatusCompat();await testHttpError();console.log("porn91 tests passed");})().catch(e=>{console.error(e);process.exit(1)});
