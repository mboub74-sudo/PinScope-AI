import {NextRequest,NextResponse} from 'next/server';
export async function GET(request:NextRequest){
 const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,150);
 if(!q)return NextResponse.json({pins:[],message:'Enter a keyword first.'},{status:400});
 const endpoint=process.env.PINSCOPE_PINS_API_URL;
 const token=process.env.PINSCOPE_PINS_API_TOKEN;
 if(!endpoint)return NextResponse.json({pins:[],message:'Live Pin provider not connected yet. Open Pinterest search below to view real Pins.'});
 try{
  const u=new URL(endpoint);u.searchParams.set('q',q);
  const res=await fetch(u,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw new Error('Provider unavailable');
  const data=await res.json();
  const pins=(Array.isArray(data.pins)?data.pins:[]).slice(0,30).filter((p:unknown)=>p&&typeof p==='object').map((p:{id?:unknown;title?:unknown;description?:unknown;imageUrl?:unknown;url?:unknown},i:number)=>({id:String(p.id||i),title:String(p.title||'Untitled Pin'),description:typeof p.description==='string'?p.description:'',imageUrl:typeof p.imageUrl==='string'&&/^https:\/\//.test(p.imageUrl)?p.imageUrl:undefined,url:typeof p.url==='string'&&/^https:\/\/(www\.)?pinterest\.[a-z.]+\//.test(p.url)?p.url:'https://www.pinterest.com/search/pins/?q='+encodeURIComponent(q)}));
  return NextResponse.json({pins,message:pins.length?`Showing ${pins.length} Pins from connected provider.`:'No Pins returned for this keyword.'});
 }catch{return NextResponse.json({pins:[],message:'Pin provider unavailable. Use Pinterest search links below.'});}
}
