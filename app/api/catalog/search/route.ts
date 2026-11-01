import { NextRequest, NextResponse } from 'next/server';
import { searchCatalog } from '../../../../lib/catalog';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const query=(req.nextUrl.searchParams.get('q')??'').trim().slice(0,240);
 const branch=(req.nextUrl.searchParams.get('branch')??'').toUpperCase();
 if(!query)return NextResponse.json({error:'Missing q parameter'},{status:400});
 if(branch&&!['ASH','RUST','PUR'].includes(branch))return NextResponse.json({error:'Unsupported prototype branch'},{status:400});
 try{return NextResponse.json({books:await searchCatalog(query,branch),source:process.env.CATALOG_MODE==='carlx'?'carlx':'demo'});}
 catch(e){console.error('Catalog lookup failed',e);return NextResponse.json({error:'Catalog service unavailable'},{status:503});}
}
