import {NextResponse} from 'next/server';import {analyze} from '../../../lib/research';
export async function POST(req:Request){try{const body=await req.json();if(typeof body.keyword!=='string')return NextResponse.json({error:'Keyword must be text'},{status:400});return NextResponse.json(analyze(body.keyword))}catch{return NextResponse.json({error:'Invalid request'},{status:400})}}
