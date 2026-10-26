const endpoint = new URLSearchParams(location.search).get('source') === 'local'
  ? 'http://localhost:3001/api/discovery-leaderboard?public=1'
  : 'https://wasteright.harshit.page/api/discovery-leaderboard?public=1';
const button=document.querySelector('#refresh'), status=document.querySelector('#status'), list=document.querySelector('#leaders'), updated=document.querySelector('#updated');
let busy=false, entries=[];
const search=document.querySelector('#search');
function render(){
  const query=search.value.trim().toLowerCase();
  const filtered=entries.filter(entry=>entry.alias.toLowerCase().includes(query));
  const fragment=document.createDocumentFragment();
  filtered.forEach((entry,i)=>{
    const row=document.createElement('li');row.className='row';row.dataset.rank=String(entry.rank);row.style.animationDelay=`${i*20}ms`;
    const rank=document.createElement('span');rank.className='rank';rank.textContent=String(entry.rank).padStart(2,'0');
    const name=document.createElement('span');name.className='name';name.textContent=entry.alias;
    const level=document.createElement('small');level.className='level';level.textContent=(entry.earned??entry.points)>=50?'Pathfinder':(entry.earned??entry.points)>=25?'Trailblazer':(entry.earned??entry.points)>=10?'Explorer':(entry.earned??entry.points)>=1?'First find':'New explorer';name.append(level);
    const score=document.createElement('strong');score.className='score';score.textContent=String(entry.points);score.setAttribute('aria-label',`${entry.points} points`);
    row.append(rank,name,score);fragment.append(row);
  });
  list.replaceChildren(fragment);
  status.hidden=filtered.length>0;
  status.textContent=entries.length?'No explorers match your search.':'No scores yet. Complete a scan to join the board.';
}
search.addEventListener('input',render);
async function refresh(){
  if(busy)return;busy=true;button.disabled=true;
  try{
    const response=await fetch(endpoint,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('unavailable');
    const data=await response.json();
    if(!Array.isArray(data.entries))throw Error('invalid response');
    entries=data.entries.slice(0,20).map((entry,i)=>{
      if(typeof entry.alias!=='string'||!Number.isSafeInteger(entry.points)||entry.points<0)throw Error('invalid entry');
      return {alias:entry.alias,points:entry.points,earned:Number.isSafeInteger(entry.earned)?entry.earned:entry.points,rank:i+1};
    });
    render();
    updated.textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }catch{status.hidden=false;status.textContent=entries.length?'Could not refresh. Showing the last loaded scores. Retry shortly.':'Scores are unavailable right now. Please try Refresh.';updated.textContent='Connection interrupted';}
  finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
setInterval(()=>{if(!document.hidden)void refresh();},30000);
void refresh();
