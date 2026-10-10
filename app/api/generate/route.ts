import {NextResponse} from 'next/server';
import {createContent} from '../../../lib/content';
export async function POST(req:Request){try{const body=await req.json();const keyword=String(body.keyword||'').trim();if(!keyword)return NextResponse.json({error:'Enter a keyword first.'},{status:400});return NextResponse.json(createContent(keyword));}catch{return NextResponse.json({error:'Invalid request'},{status:400});}}
