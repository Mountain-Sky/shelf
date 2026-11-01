export type Book = { id: string; title: string; author: string; year?: number; format: string; subjects: string[]; summary: string; branches: Record<string, number>; catalogUrl?: string; coverUrl?: string };
const demo: Book[] = [
{id:'demo-1',title:'Project Hail Mary',author:'Andy Weir',year:2021,format:'Book',subjects:['science fiction','humor','space','adventure'],summary:'A lone astronaut must solve an extraordinary scientific mystery.',branches:{ASH:2,RUST:0,PUR:1}},
{id:'demo-2',title:'The Martian',author:'Andy Weir',year:2011,format:'Book',subjects:['science fiction','humor','survival','space'],summary:'An astronaut improvises to survive after being stranded on Mars.',branches:{ASH:1,RUST:1,PUR:0}},
{id:'demo-3',title:'A Psalm for the Wild-Built',author:'Becky Chambers',year:2021,format:'Book',subjects:['science fiction','gentle','hopeful','robots'],summary:'A tea monk meets a robot and explores what humans need.',branches:{ASH:0,RUST:1,PUR:2}},
{id:'demo-4',title:'The Westing Game',author:'Ellen Raskin',year:1978,format:'Book',subjects:['mystery','children','funny','puzzles'],summary:'Young heirs solve an eccentric and playful mystery.',branches:{ASH:1,RUST:2,PUR:0}},
{id:'demo-5',title:'Escape from Mr. Lemoncello’s Library',author:'Chris Grabenstein',year:2013,format:'Book',subjects:['mystery','children','funny','libraries'],summary:'Kids solve puzzles in a fantastical library competition.',branches:{ASH:2,RUST:1,PUR:1}},
{id:'demo-6',title:'The Wild Robot',author:'Peter Brown',year:2016,format:'Book',subjects:['children','robots','nature','adventure'],summary:'A robot learns to survive on an island among animals.',branches:{ASH:0,RUST:2,PUR:1}},
{id:'demo-7',title:'The Thursday Murder Club',author:'Richard Osman',year:2020,format:'Book',subjects:['mystery','funny','cozy','adult'],summary:'Four retirees take on a real murder mystery.',branches:{ASH:2,RUST:0,PUR:1}},
{id:'demo-8',title:'The Hobbit',author:'J. R. R. Tolkien',year:1937,format:'Book',subjects:['fantasy','adventure','classic'],summary:'Bilbo Baggins embarks on an unexpected journey.',branches:{ASH:1,RUST:1,PUR:2}}
];
export function getMockBooks(){return demo;}
export function searchMock(query:string,branch:string):Book[]{
 const words=query.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2 && !['the','and','for','with','something','like','book','books','read','want','need','find','show','about','that','available','today','please','more'].includes(w));
 const scored=demo.map(b=>{let content=[b.title,b.author,b.summary,...b.subjects].join(' ').toLowerCase();let score=words.reduce((n,w)=>n+(content.includes(w)?1:0),0);return {b,score};}).filter(x=>(!branch || (x.b.branches[branch]??0)>0)).sort((a,b)=>b.score-a.score);
 const matches=scored.filter(x=>x.score>0).map(x=>x.b);
 return (matches.length?matches:scored.map(x=>x.b)).slice(0,8);
}
export async function searchCatalog(query:string,branch:string):Promise<Book[]>{
 if(process.env.CATALOG_MODE==='carlx') throw new Error('CarlX adapter is not connected. Implement the adapter using your verified SOAP request before enabling carlx mode.');
 return searchMock(query,branch);
}
