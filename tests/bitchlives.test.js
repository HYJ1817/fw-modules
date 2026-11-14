/**
 * 碧池直播单测：元信息、JSON 解析、参数校验（不依赖外网）
 */
const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
const SAMPLE={zhubo:[
  {title:"开心",address:"http://xbo.xn--ypzw80d.com/live/cx_1.flv?wsSecret=a&wsTime=1",img:"https://cdn.example/a.jpg"},
  {title:"",address:"http://x/empty-title.flv",img:""},
  {title:"无地址",address:"",img:""}
]};
function load(data){
  const ctx={console:{log(){},warn(){},error(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,URL,
    encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async()=>({data:data,status:200})},html:{load:()=>({})},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/bitchlives.js"),"utf8"),ctx,{filename:"bitchlives.js"});
  return ctx;
}
function testMetadata(){
  const w=load(SAMPLE),m=w.WidgetMetadata;
  assert.strictEqual(m.id,"hyj1817.bitchlives.home");
  assert.strictEqual(m.modules[0].type,"video");
  assert.ok(m.modules[0].params[0].enumOptions.length>50,"分类应完整保留");
  assert.ok(m.icon&&m.icon.startsWith("https://"));
}
async function testParse(){
  const w=load(SAMPLE);
  const out=await w.getVideos({category:"jsonkawayi"});
  assert.strictEqual(out.length,1,"应过滤掉无标题/无地址的条目");
  assert.strictEqual(out[0].title,"开心");
  assert.strictEqual(out[0].playerType,"ijk","FLV 直播必须用 ijk");
  assert.ok(/^http:\/\/.+\.flv/.test(out[0].videoUrl));
  assert.ok(out[0].customHeaders&&out[0].customHeaders.Referer);
}
async function testMissingCategory(){
  const w=load(SAMPLE);
  let failed=false;
  try{ await w.getVideos({}); }catch(e){ failed=true; }
  assert.ok(failed,"缺 category 应报错");
}
(async()=>{testMetadata();await testParse();await testMissingCategory();console.log("bitchlives tests passed");})().catch(e=>{console.error(e);process.exit(1)});
