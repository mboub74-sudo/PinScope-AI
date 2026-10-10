'use client';
import {useState} from 'react';
type Pin={title:string;url:string;saves:number|null;likes:number|null;published:string|null;source:string};
export default function PinterestUrlImport({onPins}:{onPins:(pins:Pin[])=>void}){
 const [url,setUrl]=useState('https://ca.pinterest.com/search/pins/?q=quick%20healthy%20dinner%20recipes');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function run(){
  setBusy(true);setMessage('');
  try{
   const res=await fetch('/api/pinterest-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'Import failed');
   if(Array.isArray(data.pins)&&data.pins.length)onPins(data.pins);
   setMessage((data.message||'')+' '+(data.pins?.length||0)+' verified Pin records imported.');
  }catch(e){setMessage(e instanceof Error?e.message:'Could not import URL.')}finally{setBusy(false)}
 }
 return <div className="notice" style={{marginBottom:16}}>
  <h3>Import by Pinterest URL (Preview)</h3>
  <p>Official API only: searches Pins associated with the authorized account, not Pinterest-wide results. No scraping, browser cookies, or invented engagement counts.</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <input aria-label="Pinterest search URL" style={{flex:'1 1 340px',minWidth:0}} type="url" value={url} onChange={e=>setUrl(e.target.value)}/>
   <button className="action" onClick={run} disabled={busy}>{busy?'Checking...':'Import by URL'}</button>
  </div>
  {message&&<p role="status">{message}</p>}
 </div>
}
