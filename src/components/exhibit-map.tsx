import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, Github, X, Compass, ChevronDown } from 'lucide-react'
import { exhibits } from '../lib/exhibits'

export function ExhibitView({ index, lang, onSelect, onClose }: { index: number; lang: 'zh' | 'en'; onSelect: (index:number)=>void; onClose: ()=>void }) {
 const zh=lang==='zh',exhibit=exhibits[index]
 const [waypoint,setWaypoint]=useState(0)
 const stop=Math.min(waypoint,2),topic=exhibit.topics[stop]
 return <div className={`atlas-view atlas-theme-${index}`}>
  <header className="atlas-header"><button onClick={onClose} autoFocus><ArrowLeft size={17}/>{zh?'返回工作室':'Back to studio'}</button><span>ZEXI / FIELD ATLAS</span><button onClick={onClose} aria-label={zh?'关闭展区':'Close exhibit'}><X size={21}/></button></header>
  <div className="atlas-scroll" key={exhibit.id}>
   <div className="atlas-roller atlas-roller-top" aria-hidden="true"/>
   <main className="atlas-paper">
    <div className="atlas-meta"><span>CHART {exhibit.number} / 03</span><span>{zh?'技术探索地图':'TECHNOLOGY FIELD MAP'}</span><Compass size={25}/></div>
    <nav className="atlas-tabs" aria-label={zh?'展区导航':'Exhibit navigation'}>{exhibits.map((item,i)=><button key={item.id} onClick={()=>{setWaypoint(0);onSelect(i)}} aria-current={index===i?'page':undefined}><small>{item.number}</small>{zh?item.name:item.en}</button>)}</nav>
    <div className="atlas-title"><div><p className="atlas-overline">{exhibit.kind} / EXPLORATION ROUTE</p><h2 id="detail-title">{zh?exhibit.name:exhibit.en}</h2><p className="atlas-subtitle">{zh?exhibit.subtitle:exhibit.subtitleEn}</p><p className="atlas-summary">{zh?exhibit.summary:exhibit.summaryEn}</p></div><div className="atlas-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="70"/><circle cx="90" cy="90" r="55" strokeDasharray="2 7"/><path d="M90 13L104 76L167 90L104 104L90 167L76 104L13 90L76 76Z"/><path d="M90 30V150M30 90H150"/><circle cx="90" cy="90" r="5"/></svg><small>ORIENT · EXPLORE · BUILD</small></div></div>
    <section className="atlas-route" aria-labelledby="route-title"><div className="atlas-section-label"><h3 id="route-title">{zh?'沿路线探索':'Follow the route'}</h3><span>{zh?'点击节点展开':'SELECT A WAYPOINT'}</span></div><div className="atlas-waypoints"><svg aria-hidden="true" viewBox="0 0 900 120" preserveAspectRatio="none"><path d="M110 70C230 0 320 120 450 65S650 10 790 70"/></svg>{exhibit.topics.map((item,i)=><button key={item[0]} onClick={()=>setWaypoint(i)} aria-expanded={stop===i} aria-controls="atlas-waypoint-detail"><span className="atlas-pin">0{i+1}</span><strong>{zh?item[0]:item[1]}</strong><small>{stop===i?(zh?'正在查看':'READING'):(zh?'探索此处':'EXPLORE')}</small></button>)}</div><article id="atlas-waypoint-detail" className="atlas-waypoint-detail" aria-live="polite"><div><span className="atlas-overline">WAYPOINT 0{stop+1} / {exhibit.source}</span><h4>{zh?topic[0]:topic[1]}</h4><p>{zh?topic[2]:topic[3]}</p></div><button onClick={()=>setWaypoint((stop+1)%3)}>{zh?'下个节点':'Next waypoint'}<ArrowUpRight size={17}/></button></article></section>
    <section className="atlas-code"><div><span className="atlas-overline">DESTINATION / GITHUB</span><h3>{zh?'从地图，走向代码。':'From the map to the code.'}</h3><p>{zh?'个人项目与代码统一收录在我的 GitHub，具体实现、进展和说明以仓库内容为准。':'My projects and code live on GitHub. Repositories contain the implementation, progress and project details.'}</p></div><a className="atlas-github" href="https://github.com/ZexiLi429" target="_blank" rel="noreferrer"><Github size={18}/>{zh?'前往我的 GitHub':'Explore my GitHub'}<ArrowUpRight size={17}/></a></section>
    <details className="atlas-reference"><summary>{zh?'技术参考与来源':'Technical references & sources'}<ChevronDown size={15}/></summary><p>{zh?'本图是根据成熟开源技术的官方资料整理的导览，不代表个人已完成的项目成果。':'This guide summarizes established open-source technology from official documentation; it does not describe personal project achievements.'}</p><a href={exhibit.sourceUrl} target="_blank" rel="noreferrer">{exhibit.source} / {zh?'官方文档':'Official documentation'}<ArrowUpRight size={14}/></a></details>
    <footer className="atlas-footer"><span>ZEXI · EXPLORE / BUILD / CONNECT</span><button onClick={()=>{setWaypoint(0);onSelect((index+1)%3)}}>{zh?'下一张地图':'Next map'}<ArrowUpRight size={16}/></button></footer>
   </main><div className="atlas-roller atlas-roller-bottom" aria-hidden="true"/>
  </div>
 </div>
}
