import {Book, searchCatalog} from './catalog';

export type DiscoveryTrace = {
  intent: 'known_item'|'recommendation'|'availability'|'exploration';
  query: string;
  expandedQueries: string[];
  constraints: string[];
  catalogMode: 'demo'|'carlx';
  candidateCount: number;
  ranked: {id:string; title:string; score:number; reasons:string[]}[];
  stagesMs: {planning:number; retrieval:number; ranking:number; total:number};
  notes: string[];
};
const intentPatterns = {
  availability: /available|on the shelf|in stock|pick up|at (rust|ashburn|purcellville)/i,
  known_item: /^(find|where is|do you have|search for) .{3,90}$/i,
  recommendation: /recommend|something like|similar to|what should|my next|in the mood|loved|enjoyed/i,
};
const stop = new Set('the and for from with that this book books want need find show something more less today please about good great looking like read reading have can you are let me some than into your mine mine what should recommend available at in of on an a is to by my it for'.split(' '));
const synonymSets: Record<string,string[]> = {
  funny:['humor','funny','comedy'], humorous:['humor','funny','comedy'],
  cozy:['cozy','gentle'], comforting:['gentle','hopeful'], uplifting:['hopeful','gentle'],
  space:['space','science fiction'], sci:['science fiction','space'],
  kids:['children','adventure'], child:['children'], young:['children'],
  suspense:['mystery'], puzzling:['puzzles','mystery'],
  adventurous:['adventure'], robot:['robots'],
};
export function planDiscovery(message:string, previousQuery='') {
  const trimmed = message.trim().slice(0,500);
  const refinement = /^(more|less|only|but|something|what about|show me|make it|instead|these|those|the second|the first)/i.test(trimmed) && Boolean(previousQuery);
  const query = refinement ? `${previousQuery} ${trimmed}`.slice(0,600) : trimmed;
  const words = Array.from(new Set((query.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(x=>x.length>2&&!stop.has(x))));
  const expansions = Array.from(new Set(words.flatMap(w=>synonymSets[w]||[w]))).slice(0,18);
  const intent = intentPatterns.availability.test(trimmed) ? 'availability' : intentPatterns.recommendation.test(trimmed) ? 'recommendation' : intentPatterns.known_item.test(trimmed) ? 'known_item' : 'exploration';
  const constraints = [/(child|kid|young|9.year.old|10.year.old|12.year.old)/i.test(query)?'Children or teen interest':'', /(funny|humor)/i.test(query)?'Humorous tone':'',/(mystery|puzzle)/i.test(query)?'Mystery elements':'',/(less technical|accessible)/i.test(query)?'Accessible writing':''].filter(Boolean);
  return {intent,query,expandedQueries:expansions,constraints,refinement};
}
export function rankBooks(books:Book[], expansions:string[], branch:string) {
  const ranked=books.map(book=>{
    const title=book.title.toLowerCase(), author=book.author.toLowerCase(), subjects=book.subjects.join(' ').toLowerCase(), summary=book.summary.toLowerCase();
    let score=0; const reasons:string[]=[];
    for(const term of expansions){
      const weight=title.includes(term)?6:author.includes(term)?5:subjects.includes(term)?3:summary.includes(term)?1:0;
      if(weight){score+=weight;if(reasons.length<3)reasons.push(`Matches “${term}”`);}
    }
    if(branch && (book.branches[branch]||0)>0){score+=2;reasons.push('Sample copy shown at selected branch');}
    return {book,score,reasons};
  }).sort((a,b)=>b.score-a.score||a.book.title.localeCompare(b.book.title));
  return ranked;
}
export async function discover(message:string,branch:string,previousQuery=''){
  const start=Date.now();const planned=planDiscovery(message,previousQuery);const plannedAt=Date.now();
  const candidates=await searchCatalog(planned.query,branch);const retrievedAt=Date.now();
  const ranked=rankBooks(candidates,planned.expandedQueries,branch);const rankedAt=Date.now();
  const trace:DiscoveryTrace={intent:planned.intent,query:planned.query,expandedQueries:planned.expandedQueries,constraints:planned.constraints,catalogMode:process.env.CATALOG_MODE==='carlx'?'carlx':'demo',candidateCount:candidates.length,ranked:ranked.map(r=>({id:r.book.id,title:r.book.title,score:r.score,reasons:r.reasons})),stagesMs:{planning:plannedAt-start,retrieval:retrievedAt-plannedAt,ranking:rankedAt-retrievedAt,total:rankedAt-start},notes:['Demo titles and branch counts are fictional test fixtures, NOT verified LCPL holdings.','Scores are deterministic prototype heuristics, not Decision API or LLM results.',...(planned.refinement?['Follow-up interpreted using the previous query.']:[])]};
  return {books:ranked.map(r=>r.book),trace};
}
