import { NextRequest, NextResponse } from 'next/server';
import { discover } from '../../../../lib/discovery';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const message=typeof body.message==='string'?body.message.trim().slice(0,500):'';
  const previousQuery=typeof body.previousQuery==='string'?body.previousQuery.slice(0,500):'';
  const branch=typeof body.branch==='string'?body.branch.toUpperCase():'';
  if(!message||!['','ASH','RUST','PUR'].includes(branch))return NextResponse.json({error:'Invalid request'},{status:400});
  const {books,trace}=await discover(message,branch,previousQuery);
  let reply=`I found ${books.length} demonstration titles to explore${branch?' for '+branch:''}. These are not live LCPL records. Try refining your request, or open the Discovery Engine panel to see how results were selected.`;
  const key=process.env.OPENAI_API_KEY;
  if(key&&books.length){
   const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.4-mini',store:false,instructions:'You are Shelf, a helpful public library discovery guide. Only discuss supplied titles; do not invent books or imply fake holdings are real. In this prototype all catalog holdings are DEMO fixtures. In 90 words or fewer, briefly explain which candidates might suit the request, indicate clearly this is demo data, and suggest one concise refinement. Never ask for patron data.',input:JSON.stringify({patronRequest:message,branch,candidates:books.map(b=>({title:b.title,author:b.author,summary:b.summary,subjects:b.subjects}))})})});
   if(response.ok){const data=await response.json();reply=data.output_text||data.output?.flatMap((x:{content?:{type:string;text?:string}[]})=>x.content??[]).filter((x:{type:string})=>x.type==='output_text').map((x:{text?:string})=>x.text).join(' ')||reply;}
  }
  return NextResponse.json({reply,books,source:trace.catalogMode,trace});
 }catch(e){console.error('Discovery failed',e);return NextResponse.json({error:'Unable to complete discovery request'},{status:503});}
}
