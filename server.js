const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
function loadEnv(){
  const p=path.join(ROOT,'.env'); if(!fs.existsSync(p)) return;
  for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){
    const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['\"]|['\"]$/g,'');
  }
}
loadEnv();
const MODEL=process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_KEY=process.env.GEMINI_API_KEY;
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});res.end(JSON.stringify(data));}
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');}
async function chat(message,user,history=[],memories=[]){
  if(!API_KEY) throw new Error('GEMINI_API_KEY is not configured in the server .env file.');
  const memoryText=Array.isArray(memories)&&memories.length?memories.slice(0,30).map(m=>`- [${String(m.category||'Other')}] ${String(m.content||'')}`).join('\n'):'No saved memories provided.';
  const historyText=Array.isArray(history)&&history.length?history.slice(-14).map(m=>`${m.role==='model'?'ULTRON':'USER'}: ${String(m.text||'')}`).join('\n'):'No previous messages.';
  const system=`You are ULTRON, a personal AI assistant. Be intelligent, calm, friendly, helpful and slightly witty. Address the signed-in user naturally when useful. Give concise but useful answers. Do not claim to be human.\n\nSigned-in operator: ${user||'Operator'}\n\nSaved ULTRON memory (use only when relevant; do not reveal the memory list unless asked):\n${memoryText}\n\nRecent conversation context:\n${historyText}`;
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:message}]}],generationConfig:{temperature:0.7,maxOutputTokens:800}};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.message||`Gemini request failed (${r.status}).`);
  const reply=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();if(!reply)throw new Error('Gemini returned no text response.');return reply;
}

const server=http.createServer(async(req,res)=>{
  cors(res); if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.url==='/api/health'&&req.method==='GET') return json(res,200,{ok:true,geminiConfigured:Boolean(API_KEY),model:MODEL});
  if(req.url==='/api/chat'&&req.method==='POST'){
    let raw=''; req.on('data',c=>{raw+=c;if(raw.length>20000) req.destroy();});
    req.on('end',async()=>{try{const b=JSON.parse(raw||'{}');const message=String(b.message||'').trim();if(!message)return json(res,400,{error:'Message is required.'});if(message.length>4000)return json(res,400,{error:'Message is too long.'});const history=Array.isArray(b.history)?b.history.slice(-14):[];const memories=Array.isArray(b.memories)?b.memories.slice(0,30):[];const reply=await chat(message,String(b.user||'Operator'),history,memories);json(res,200,{reply});}catch(e){json(res,500,{error:e.message||'ULTRON brain error.'});}});return;
  }
  let pathname=decodeURIComponent(req.url.split('?')[0]); if(pathname==='/') pathname='/index.html';
  const file=path.join(ROOT,pathname);
  if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory()) return json(res,404,{error:'Not found'});
  const ext=path.extname(file).toLowerCase(); const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.webm':'video/webm'};
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
server.listen(PORT,()=>console.log(`ULTRON server running at http://localhost:${PORT}`));
