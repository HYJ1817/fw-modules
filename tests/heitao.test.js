/**
 * 黑桃短剧（WeBox 移植版）单测：链接编解码、MD5 兜底、元信息；不依赖外网
 */
const assert=require("assert"),crypto=require("crypto"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.resolve(__dirname,"..");
function load(){
  const ctx={console:{log(){}},Date,JSON,Math,Promise,String,Number,Object,Array,Error,RegExp,setTimeout,URL,
    encodeURIComponent,decodeURIComponent,parseInt,parseFloat,isNaN,
    Widget:{http:{get:async()=>({data:"",status:200})},html:{load:()=>({})},sharedCache:null,storage:null}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"widgets/heitao.js"),"utf8"),ctx,{filename:"heitao.js"});
  return ctx;
}
function testMetadata(){
  const w=load(),meta=w.WidgetMetadata;
  assert.strictEqual(meta.id,"hyj1817.heitao.home");
  assert.strictEqual(typeof w.loadDetail,"function");
  assert.ok(meta.modules.some(m=>m.id==="categories"));
  assert.strictEqual(meta.modules.filter(m=>m.type==="stream").length,1);
  assert.ok(meta.globalParams.some(p=>p.name==="multiSource"));
}
function testMd5(){
  const w=load();
  for (const text of ["","abc","黄果短剧 test","x".repeat(200)]) {
    assert.strictEqual(w.hdMd5(text),crypto.createHash("md5").update(text,"utf8").digest("hex"),"md5 不一致: "+text.slice(0,10));
  }
}
function testLinkCodec(){
  const w=load();
  const link=w.hdMakeLink("/index.php/vod/detail/id/1152.html");
  assert.ok(link.startsWith("heitao:"));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w.hdParseLink(link))),{contentId:"/index.php/vod/detail/id/1152.html",groupId:"",episodeId:""});
  const ep=w.hdMakeLink("/index.php/vod/detail/id/1152.html","main","/index.php/vod/play/id/1152/sid/1/nid/3.html");
  const parsed=w.hdParseLink(ep);
  assert.strictEqual(parsed.groupId,"main");
  assert.ok(parsed.episodeId.indexOf("/nid/3")>0);
  assert.strictEqual(w.hdParseLink(encodeURIComponent(link)).contentId,"/index.php/vod/detail/id/1152.html");
  assert.strictEqual(w.hdParseLink("huangguo:1:1"),null);
  assert.strictEqual(w.hdParseLink("heitao:"),null);
}
async function testGuards(){
  const w=load();
  assert.strictEqual((await w.loadResource({multiSource:"disabled",link:w.hdMakeLink("/x","main","/y")})).length,0);
  assert.strictEqual((await w.loadResource({link:"bad"})).length,0);
  assert.strictEqual(await w.loadDetail("bad"),null);
  assert.strictEqual((await w.search({keyword:"  "})).length,0);
}
(async()=>{testMetadata();testMd5();testLinkCodec();await testGuards();console.log("heitao tests passed");})().catch(e=>{console.error(e);process.exit(1)});
