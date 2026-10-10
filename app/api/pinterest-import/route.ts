import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
const hosts=new Set(['pinterest.com','www.pinterest.com','ca.pinterest.com','fr.pinterest.com']);
export async function POST(req:NextRequest){
 let input:unknown;
 try{input=(await req.json()).url}catch{return NextResponse.json({error:'Expected JSON with a Pinterest URL.'},{status:400})}
 if(typeof input!=='string'||input.length>2048)return NextResponse.json({error:'Enter a valid Pinterest search URL.'},{status:400});
 let target:URL;
 try{target=new URL(input)}catch{return NextResponse.json({error:'Invalid URL.'},{status:400})}
 if(target.protocol!=='https:'||!hosts.has(target.hostname)||target.pathname!=='/search/pins/')return NextResponse.json({error:'Only official Pinterest /search/pins/ HTTPS links are accepted.'},{status:400});
 const query=(target.searchParams.get('q')||'').trim();
 if(!query||query.length>150)return NextResponse.json({error:'Pinterest search URL must contain a valid q keyword.'},{status:400});
 const token=process.env.PINTEREST_ACCESS_TOKEN;
 if(!token)return NextResponse.json({query,pins:[],mode:'not_connected',message:'Pinterest API is not connected. Import your own saved Pinterest HTML or CSV instead. Public Pinterest search results cannot be fetched reliably from this URL alone.'});
 try{
  const endpoint=new URL('https://api.pinterest.com/v5/search/pins');
  endpoint.searchParams.set('query',query);
  const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok){
   const message=response.status===403?'Pinterest refused access (403). Check app approval and pins:read permissions.':response.status===401?'Pinterest token expired or unauthorized (401).':response.status===429?'Pinterest rate limit reached (429).':'Pinterest API returned HTTP '+response.status+'.';
   return NextResponse.json({query,pins:[],mode:'api_error',message});
  }
  const data=await response.json();
  const items=Array.isArray(data.items)?data.items:[];
  const pins=items.filter((p:unknown)=>p&&typeof p==='object').map((p:Record<string,unknown>)=>{
   const id=String(p.id||'');
   if(!/^\d{8,25}$/.test(id))return null;
   const title=String(p.title||p.description||'').trim();
   if(!title)return null;
   const date=typeof p.created_at==='string'&&!Number.isNaN(Date.parse(p.created_at))?new Date(p.created_at).toISOString().slice(0,10):null;
   return {title,url:'https://www.pinterest.com/pin/'+id+'/',saves:null,likes:null,published:date,source:'Pinterest API (authorized account search)'};
  }).filter(Boolean).slice(0,50);
  return NextResponse.json({query,pins,mode:'authorized_account',message:'Results are limited to the authorized Pinterest account, not global Pinterest search. Saves and Likes are N/A unless independently verified.'});
 }catch{return NextResponse.json({query,pins:[],mode:'network_error',message:'Pinterest API could not be reached. Try HTML/CSV import; no results were invented.'})}
}
