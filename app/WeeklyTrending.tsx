'use client';
import {useMemo,useState} from 'react';

type Pin={id:string;title:string;url:string;saves:number|null;likes:number|null;published:string|null;source:string};
type Ranked=Pin & {days:number|null;rate:number|null};
const toNumber=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:typeof value==='string'&&/^\\d+$/.test(value)?Number(value):null;
function parseHtml(html:string):Pin[]{
 const found=new Map<string,Pin>();
 const script=/<script\\b[^>]*id=["']__PWS_INITIAL_PROPS__["'][^>]*>([\\s\\S]*?)<\\/script>/i.exec(html);
 const fallback=/<script\\b[^>]*id=["']__PWS_DATA__["'][^>]*>([\\s\\S]*?)<\\/script>/i.exec(html);
 const sources=[script?.[1],fallback?.[1]].filter((s):s is string=>Boolean(s));
 for(const source of sources){
  try{
   const root=JSON.parse(source) as Record<string,unknown>;
   const state=root.initialReduxState as Record<string,unknown>|undefined;
   const pinDict=state?.pins;
   if(pinDict&&typeof pinDict==='object'&&!Array.isArray(pinDict)){
    for(const item of Object.values(pinDict as Record<string,unknown>)) add(item);
   }else{
    // Some Pinterest snapshots use a different layout; inspect only pin-like objects.
    const seen=new WeakSet<object>();let visited=0;
    function walk(value:unknown,depth:number){
     if(!value||typeof value!=='object'||depth>24||visited++>90000||seen.has(value))return;
     seen.add(value);
     if(Array.isArray(value)){for(const child of value)walk(child,depth+1);return}
     const obj=value as Record<string,unknown>;
     if(/^\\d{8,25}$/.test(String(obj.id||''))&&(obj.aggregated_pin_data||obj.grid_title||obj.images))add(obj);
     for(const [key,child] of Object.entries(obj)){
      if(['context','experiments','user','partner','advertiser','cookies','headers','viewer'].includes(key))continue;
      walk(child,depth+1);
     }
    }
    walk(root,0);
   }
  }catch{/* malformed or incomplete HTML; no data invented */}
 }
 function add(value:unknown){
  if(!value||typeof value!=='object')return;
  const o=value as Record<string,unknown>;
  const id=String(o.id||'');
  if(!/^\\d{8,25}$/.test(id))return;
  const title=String(o.title||o.grid_title||o.description||'').replace(/\\s+/g,' ').trim();
  if(!title)return;
  const agg=o.aggregated_pin_data as Record<string,unknown>|undefined;
  const stats=agg?.aggregated_stats as Record<string,unknown>|undefined;
  const saves=toNumber(stats?.saves??o.save_count??o.saves);
  const likes=toNumber(o.like_count??o.likes);
  const raw=o.created_at??o.created_time;
  const parsed=typeof raw==='string'||typeof raw==='number'?new Date(raw):null;
  const published=parsed&&!Number.isNaN(parsed.getTime())?parsed.toISOString().slice(0,10):null;
  const record:Pin={id,title,url:'https://www.pinterest.com/pin/'+id+'/',saves,likes,published,source:'User-supplied Pinterest HTML'};
  const prev=found.get(id);
  if(!prev||Number(record.saves!==null)+Number(record.published!==null)>Number(prev.saves!==null)+Number(prev.published!==null))found.set(id,record);
 }
 return [...found.values()];
}
function rank(pins:Pin[],today:string):Ranked[]{
 const todayMs=Date.parse(today+'T00:00:00Z');
 return pins.map(p=>{
  const age=p.published?Math.floor((todayMs-Date.parse(p.published+'T00:00:00Z'))/86400000):null;
  const days=age===null||age<0?null:Math.max(1,age);
  return {...p,days,rate:days!==null&&p.saves!==null?p.saves/days:null};
 }).sort((a,b)=>(b.rate??-1)-(a.rate??-1)||(b.saves??-1)-(a.saves??-1));
}
function exportCsv(items:Ranked[],name:string){
 const escape=(v:unknown)=>'"'+String(v??'N/A').replace(/"/g,'""')+'"';
 const header=['Rank','Title','Pin URL','Saves','Likes','Published','Age (days)','Saves / Day','Source'];
 const lines=[header.join(','),...items.map((p,i)=>[i+1,p.title,p.url,p.saves,p.likes,p.published,p.days,p.rate===null?null:p.rate.toFixed(2),p.source].map(escape).join(','))];
 const blob=new Blob(['\\ufeff'+lines.join('\\r\\n')],{type:'text/csv;charset=utf-8'});
 const href=URL.createObjectURL(blob);const link=document.createElement('a');link.href=href;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
export default function WeeklyTrending({onPins}:{onPins?:(pins:{title:string;url:string;saves:number|null;likes:number|null;published:string|null;source:string}[])=>void}){
 const [html,setHtml]=useState(''),[pins,setPins]=useState<Pin[]>([]),[status,setStatus]=useState('');
 const [today,setToday]=useState(()=>new Date().toISOString().slice(0,10));
 const ranked=useMemo(()=>rank(pins,today),[pins,today]);
 const weekly=useMemo(()=>{const start=Date.parse(today+'T00:00:00Z')-6*86400000;const end=Date.parse(today+'T00:00:00Z');return ranked.filter(p=>p.published&&Date.parse(p.published+'T00:00:00Z')>=start&&Date.parse(p.published+'T00:00:00Z')<=end)},[ranked,today]);
 function analyze(raw:string){
  if(raw.length>15_000_000){setStatus('HTML too large (15 MB max).');return}
  const results=parseHtml(raw);
  setPins(results);
  setStatus(results.length?'Extracted '+results.length+' unique Pins locally in your browser. Only public Pin fields are retained.':'No Pins found. Paste a complete Pinterest search page HTML containing __PWS_INITIAL_PROPS__, or upload the full .html/.txt file.');
  if(results.length&&onPins)onPins(results.map(({title,url,saves,likes,published,source})=>({title,url,saves,likes,published,source})));
 }
 async function upload(file:File|undefined){
  if(!file)return;
  if(file.size>15_000_000){setStatus('File too large (15 MB max).');return}
  try{const raw=await file.text();setHtml('');analyze(raw)}catch{setStatus('Could not read HTML file.')}
 }
 function table(items:Ranked[],empty:string){return items.length?<div className="tablewrap"><table><thead><tr><th>#</th><th>Pin</th><th>Published</th><th>Saves</th><th>Days</th><th>Saves / Day</th><th>Link</th></tr></thead><tbody>{items.slice(0,50).map((p,i)=><tr key={p.id}><td>{i+1}</td><td>{p.title}</td><td>{p.published||'N/A'}</td><td>{p.saves??'N/A'}</td><td>{p.days??'N/A'}</td><td>{p.rate===null?'N/A':p.rate.toFixed(2)}</td><td><a href={p.url} target="_blank" rel="noopener noreferrer">Open ↗</a></td></tr>)}</tbody></table></div>:<p>{empty}</p>}
 return <section className="panel">
  <div className="panelhead"><div><h2>Weekly Pinterest Trends — Paste HTML</h2><p>Analyze your saved Pinterest search HTML directly in the browser. No Pinterest scraping, account cookies or HTML uploads to our server.</p></div></div>
  <label htmlFor="pinscope-html-paste"><strong>Paste Pinterest HTML here</strong></label>
  <textarea id="pinscope-html-paste" value={html} onChange={e=>setHtml(e.target.value)} placeholder={'Paste the full Pinterest search page HTML here, including the __PWS_INITIAL_PROPS__ script…'} style={{width:'100%',minHeight:190,marginTop:10,marginBottom:12,fontFamily:'monospace',fontSize:12}}/>
  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
   <button className="action" onClick={()=>analyze(html)} disabled={!html.trim()}>Analyze HTML</button>
   <label>Or upload .html / .txt <input type="file" accept=".html,.htm,.txt,text/html,text/plain" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/></label>
   <label>Analysis date <input type="date" value={today} onChange={e=>setToday(e.target.value)}/></label>
   <button onClick={()=>{setHtml('');setPins([]);setStatus('Cleared analysis.')}}>Clear</button>
  </div>
  {status&&<div className="notice" role="status" style={{marginTop:14}}>{status}</div>}
  <div className="notice" style={{marginTop:14}}>Saves / Day = total Saves ÷ age in calendar days (minimum 1). New This Week means published within the 7 calendar days ending on the analysis date. This is an average since publication, <strong>not measured growth in the last 7 days</strong>. Missing metrics stay N/A; Repins are not treated as Saves.</div>
  <div className="panelhead" style={{marginTop:22}}><div><h3>New This Week — ranked by Saves / Day</h3><p>{weekly.length} Pins published in the selected 7-day window</p></div><button className="action" disabled={!weekly.length} onClick={()=>exportCsv(weekly,'pinscope-trending-last-7-days.csv')}>Download 7-day CSV</button></div>
  {table(weekly,'No Pins published in the selected 7-day period were found in this HTML.')}
  <div className="panelhead" style={{marginTop:26}}><div><h3>All Pins — ranked by Saves / Day</h3><p>{ranked.length} unique Pins from the supplied HTML</p></div><button className="action" disabled={!ranked.length} onClick={()=>exportCsv(ranked,'pinscope-all-saves-per-day.csv')}>Download all CSV</button></div>
  {table(ranked,'Paste a full HTML page or upload a file to see rankings.')}
 </section>
}
