/**
 * MissAV 女优影片（枚举式）单测：不依赖外网
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const jsdom=require("jsdom"),JQ=fs.readFileSync(path.join(ROOT,"node_modules/jquery/dist/jquery.js"),"utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
const PAGE='<html><body>'+
 '<div><a href="/cn/abc-123"><img data-src="https://fourhoi.com/v/abc-123/cover-t.jpg"><span>测试影片 A</span></a></div>'+
 '<div><a href="/cn/def-456-uncensored-leak"><img data-src="https://fourhoi.com/v/def-456/cover-t.jpg"><span>测试影片 B</span></a></div>'+
 '</body></html>'+ " ".repeat(60000);
function load(responses){
  const requested=[];
  const ctx={console:{log(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async(u)=>{requested.push(u);const hit=Object.keys(responses).find(k=>u.indexOf(k)>=0);return {data:hit?responses[hit]:"",status:200};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/missav.js"),"utf8"),ctx,{filename:"missav.js"});
  ctx.__requested=requested;return ctx;
}
(async()=>{
  const w=load({});
  const mod=w.WidgetMetadata.modules.find(m=>m.id==="actressVideos");
  assert.ok(mod,"应有 actressVideos 模块");
  assert.strictEqual(mod.functionName,"loadActressVideos");
  const param=mod.params.find(p=>p.name==="actress");
  assert.strictEqual(param.type,"enumeration");
  assert.strictEqual(param.enumOptions.length,50,"枚举应有 50 位女优");
  assert.strictEqual(param.enumOptions[0].title,"瀬戶環奈");
  assert.strictEqual(param.value,param.enumOptions[0].value,"默认选中第一位");

  const ctx=load({"/dm24/actresses/":PAGE});
  const items=await ctx.loadActressVideos({actress:"瀬戶環奈",page:"1"});
  assert.ok(items.length>=1,"应返回影片条目");
  assert.ok(items.every(x=>/^https?:\/\//.test(x.link)),"条目要带可播放链接");
  assert.ok(ctx.__requested[0].indexOf("/dm24/actresses/")>=0,"应请求该女优的页面");

  // 传「标题」也要能匹配（宿主可能传标题）
  const ctx2=load({"/dm389/actresses/":PAGE});
  const items2=await ctx2.loadActressVideos({actress:"松本一香",page:"1"});
  assert.ok(items2.length>=1);
  console.log("missav-actress tests passed | 枚举50位，瀬戶環奈 ->",items.length,"部");
})().catch(e=>{console.error(e);process.exit(1)});
