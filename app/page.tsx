"use client";
import {useState} from 'react';
import {ArrowUp,BookOpen,MapPin,Search,Sparkles,Bug,Bookmark,BookmarkCheck,Copy} from 'lucide-react';
import type {Book} from '../lib/catalog';
import type {DiscoveryTrace} from '../lib/discovery';
type Turn={role:'user'|'assistant';text:string};
export default function Home(){
 const [prompt,setPrompt]=useState(''),[branch,setBranch]=useState('');
 const [books,setBooks]=useState<Book[]>([]),[turns,setTurns]=useState<Turn[]>([]);
 const [busy,setBusy]=useState(false),[source,setSource]=useState('demo');
 const [trace,setTrace]=useState<DiscoveryTrace|null>(null),[showLab,setShowLab]=useState(false);
 const [previousQuery,setPreviousQuery]=useState(''),[saved,setSaved]=useState<Book[]>([]);
 async function ask(q=prompt){if(!q.trim()||busy)return;setBusy(true);setPrompt('');setTurns(prev=>[...prev,{role:'user',text:q}]);try{
  const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,branch,previousQuery})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Search failed');
  setBooks(data.books);setSource(data.source);setTrace(data.trace);setPreviousQuery(data.trace.query);
  setTurns(prev=>[...prev,{role:'assistant',text:data.reply}]);
 }catch(e){setTurns(prev=>[...prev,{role:'assistant',text:e instanceof Error?e.message:'Search failed'}]);}finally{setBusy(false)}}
 function toggleSaved(book:Book){setSaved(s=>s.some(b=>b.id===book.id)?s.filter(b=>b.id!==book.id):[...s,book]);}
 return <main><header><div className="brand"><div className="mark"><BookOpen size={22}/></div><strong>shelf<span className="period">.</span></strong><span className="prototype">DISCOVERY LAB</span></div><div className="status"><span className="dot"/> {source==='demo'?'Demo catalog':'CarlX catalog'}</div></header>
 <section className="hero"><div className="eyebrow"><Sparkles size={15}/> A NEW WAY TO EXPLORE THE LIBRARY</div><h1>What are you <em>in the mood</em> for?</h1><p>Ask about stories, subjects, or something you can’t quite describe. We’ll help you find your next great read.</p>
 <div className="searchbox"><Search size={20}/><input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="A funny mystery for my 12-year-old..." aria-label="Describe a book"/><button aria-label="Search" onClick={()=>ask()} disabled={busy||!prompt.trim()}><ArrowUp size={20}/></button></div>
 <div className="filters"><MapPin size={16}/><label htmlFor="branch">Look at</label><select id="branch" value={branch} onChange={e=>setBranch(e.target.value)}><option value="">All demo branches</option><option value="ASH">Ashburn</option><option value="RUST">Rust</option><option value="PUR">Purcellville</option></select></div>
 <div className="chips">{['Something like Project Hail Mary','A funny mystery','Gentle science fiction','An adventure for kids'].map(q=><button key={q} onClick={()=>ask(q)}>{q} <span>↗</span></button>)}</div></section>
 <section className="results"><div className="resultsTop"><div><div className="eyebrow">DISCOVER YOUR NEXT READ</div><h2>{books.length?'Curated for your curiosity':'Explore something unexpected'}</h2></div><span className="count">{books.length?`${books.length} titles`:'Start with a question'}</span></div>
 <div className="labBar"><span style={{fontSize:13,color:'#61746e'}}>Prototype catalog data only · No patron accounts or live holds</span><button onClick={()=>setShowLab(x=>!x)}><Bug size={15} style={{verticalAlign:'middle',marginRight:6}}/>{showLab?'Hide':'Show'} Discovery Engine</button></div>
 {showLab&&<div className="labPanel"><h3>Discovery Engine · Developer inspector</h3>{trace?<><p className="smallText"><b>Intent:</b> {trace.intent} · <b>Candidate records:</b> {trace.candidateCount} · <b>Pipeline:</b> {trace.stagesMs.total} ms (excluding AI response)</p><p className="smallText"><b>Query:</b> {trace.query}</p><p className="smallText"><b>Expansion:</b> {trace.expandedQueries.join(' · ')||'(none)'}</p><p className="smallText"><b>Constraints:</b> {trace.constraints.join(' · ')||'(none)'}</p><h4>Ranking trace</h4><pre>{trace.ranked.map(r=>`${r.score.toString().padStart(2)}  ${r.title} — ${r.reasons.join('; ')||'no matched terms'}`).join('\n')}</pre>{trace.notes.map(n=><p key={n} className="smallText">• {n}</p>)}</>:<p className="smallText">Ask a question to inspect intent, query expansion, retrieval, ranking, and stage timing.</p>}</div>}
 {saved.length>0&&<div className="savedArea"><h3><BookmarkCheck size={18} style={{verticalAlign:'middle'}}/> My discovery shelf ({saved.length})</h3><p>{saved.map(b=>b.title).join(' · ')}</p><button className="miniAction" onClick={()=>navigator.clipboard.writeText(saved.map(b=>`${b.title} — ${b.author}`).join('\n'))}><Copy size={14} style={{verticalAlign:'middle'}}/> Copy reading list</button></div>}
 {turns.length>0&&<div className="conversation" aria-live="polite">{turns.map((t,i)=><p key={i} className={t.role}><b>{t.role==='user'?'You':'Shelf'}:</b> {t.text}</p>)}</div>}
 {turns.length>0&&<div className="refinements">{['Something funnier','More adventurous','Only mysteries','Something for kids'].map(q=><button key={q} disabled={busy} onClick={()=>ask(q)}>{q}</button>)}</div>}
 {busy&&<p className="loading">Exploring the collection...</p>}
 <div className="grid">{books.map((b,i)=><article key={b.id} className="book"><div className={'cover cover'+(i%5)}><div className="coverTitle">{b.title}</div><div className="coverAuthor">{b.author}</div></div><div className="bookContent"><div className="bookFormat">{b.format} • {b.year??'Edition unknown'}</div><h3>{b.title}</h3><div className="by">by {b.author}</div><p>{b.summary}</p><div className="holdings">{Object.entries(b.branches).filter(([code])=>!branch||code===branch).map(([code,n])=><span key={code} className={n?'available':'unavailable'}>{code}: {n?n+' demo copies':'Demo unavailable'}</span>)}</div><button className={'miniAction '+(saved.some(x=>x.id===b.id)?'active':'')} onClick={()=>toggleSaved(b)}>{saved.some(x=>x.id===b.id)?<BookmarkCheck size={15}/>:<Bookmark size={15}/>} {saved.some(x=>x.id===b.id)?'Saved to your shelf':'Save for later'}</button>{b.catalogUrl&&<a href={b.catalogUrl} target="_blank" rel="noopener noreferrer">View in catalog ↗</a>}</div></article>)}</div>
 {!books.length&&<div className="empty"><BookOpen size={35}/><p>Browse by feeling, discover by conversation.</p><small>This first version uses clearly labeled demo records. Live CarlX integration comes next.</small></div>}</section><footer>Built for discovery. Powered by your library. <span>Local prototype • No patron accounts</span></footer></main>
}
