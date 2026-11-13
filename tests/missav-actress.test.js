/**
 * MissAV 女优排行（内置 TOP50）单测：不依赖外网
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const jsdom=require("jsdom"),JQ=fs.readFileSync(path.join(ROOT,"node_modules/jquery/dist/jquery.js"),"utf8");
function htmlLoad(h){const d=new jsdom.JSDOM(String(h||"<html></html>"),{runScripts:"outside-only"});d.window.eval(JQ);return d.window.jQuery;}
const ACTRESS_PAGE='<html><body>'+
 '<div><a href="/cn/abc-123"><img data-src="https://fourhoi.com/v/abc-123/cover-t.jpg"><span>测试影片 A</span></a></div>'+
 '<div><a href="/cn/def-456-uncensored-leak"><img data-src="https://fourhoi.com/v/def-456/cover-t.jpg"><span>测试影片 B</span></a></div>'+
 '<div><a href="/actresses/ranking"><img src="https://fourhoi.com/actress/1-t.jpg"><span>女優排行</span></a></div>'+
 '</body></html>'+ " ".repeat(60000);
function load(responses){
  const ctx={console:{log(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async(u)=>{const hit=Object.keys(responses).find(k=>u.indexOf(k)>=0);return {data:hit?responses[hit]:"",status:200};}},html:{load:htmlLoad},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/missav.js"),"utf8"),ctx,{filename:"missav.js"});
  return ctx;
}
(async()=>{
  const w=load({});
  const list=w.loadActressRanking({page:"1"});
  assert.strictEqual(list.length,50,"应内置 50 位女优");
  assert.strictEqual(list[0].title,"1. 瀬戶環奈");
  assert.ok(list.every(x=>/^missavactress:/.test(x.link)));
  assert.ok(list.every(x=>/^https:\/\/fourhoi\.com\/actress\//.test(x.posterPath)));
  assert.strictEqual(w.loadActressRanking({page:"2"}).length,0,"榜单不翻页");

  const name=list[0].seriesName;
  const ctx=load({"https://missav.fans/dm24/actresses/":ACTRESS_PAGE});
  const detail=await ctx.loadDetail("missavactress:"+name);
  assert.ok(detail,"女优详情应返回对象");
  assert.strictEqual(detail.seriesName,name);
  assert.ok(detail.episodeItems.length>=1,"应解析出影片");
  assert.ok(detail.episodeItems.every(e=>/^https?:\/\//.test(e.link)),"每部片要有可播放链接");
  console.log("missav-actress tests passed |",name,"->",detail.episodeItems.length,"部");
})().catch(e=>{console.error(e);process.exit(1)});
