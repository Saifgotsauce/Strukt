/* STRUKT site script: dot graphics, scroll lighting, small interactions */

/* seeded random so every visit draws the same scatter */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pick(R,pal){const tot=pal.reduce((s,p)=>s+p[1],0);let r=R()*tot;for(const p of pal){if((r-=p[1])<=0)return p[0]}return pal[0][0]}
const NS='http://www.w3.org/2000/svg';
function draw(svg,dots,W,H,pitch,boot){
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('preserveAspectRatio',(svg.dataset.align||'xMidYMid')+' slice');
  const r=pitch*.37,k=pitch*.59;let s='';
  for(const d of dots) if(d.k) s+=`<circle class="${boot?'on':''}" style="${boot?`animation-delay:${d.t}ms`:''}" cx="${d.x}" cy="${d.y}" r="${k}" fill="#fff"/>`;
  for(const d of dots) s+=`<circle class="${boot?'on':''}" style="${boot?`animation-delay:${d.t}ms`:''}" cx="${d.x}" cy="${d.y}" r="${r}" fill="${d.c}"/>`;
  svg.innerHTML=s;
}
/* clusters of lit pixels, like a section of LED wall left on */
function scatter(svg,o){
  const R=rng(o.seed),p=14,W=o.w,H=o.h,dots=[],seen=new Set();
  const add=(x,y,c,k)=>{const key=x+','+y;if(seen.has(key))return;seen.add(key);dots.push({x:x*p+p/2,y:y*p+p/2,c,k,t:Math.round(R()*900)})};
  for(let i=0;i<o.clusters;i++){
    const x0=(o.x0||0)*W/p,x1=(o.x1||1)*W/p,y0=(o.y0||0)*H/p,y1=(o.y1||1)*H/p;const cx=x0+R()*(x1-x0),cy=y0+R()*(y1-y0),rad=(o.min+R()*(o.max-o.min))/p,kl=R()<o.keyline;
    const sx=.6+R()*.9,sy=.6+R()*.9,col=pick(R,o.pal);
    for(let y=Math.floor(cy-rad*sy);y<=cy+rad*sy;y++)for(let x=Math.floor(cx-rad*sx);x<=cx+rad*sx;x++){
      const d=Math.hypot((x-cx)/sx,(y-cy)/sy)/rad+(R()-.5)*.55;
      if(d<1&&R()<o.density*(1.15-d*.6)) add(x,y,R()<.82?col:pick(R,o.pal),kl&&d<.85);
    }
  }
  const sx0=(o.s0??o.x0??0)*W/p;for(let i=0;i<o.strays;i++) add(Math.floor(sx0+R()*(W/p-sx0)),Math.floor(R()*H/p),pick(R,o.pal),R()<.25);
  draw(svg,dots,W,H,p,svg.classList.contains('dots'));
}
/* dot lettering, 5x7 cells drawn as 2x2 dots, with pixels dropped and strays added */
const G={A:"01110100011000111111100011000110001",C:"01111100001000010000100001000001111",D:"11110100011000110001100011000111110",E:"11111100001000011110100001000011111",I:"11111001000010000100001000010011111",L:"10000100001000010000100001000011111",N:"10001110011010110011100011000110001",O:"01110100011000110001100011000101110",P:"11110100011000111110100001000010000",R:"11110100011000111110101001001010001",S:"01111100001000001110000010000111110",T:"11111001000010000100001000010000100",V:"10001100011000110001100010101000100","0":"01110100111010110101110011000101110","1":"00100011000010000100001000010001110","2":"01110100010000100010001000100011111","3":"11110000010000101110000010000111110","4":"00010001100101010010111110001000010","5":"11111100001111000001000011000101110"};
function dotText(svg,txt,o){
  const R=rng(o.seed||1),p=14,dots=[],S=o.sub||2;let x=0;
  for(const ch of txt){ if(ch===' '){x+=3;continue;} const g=G[ch]; if(!g)continue;
    for(let i=0;i<35;i++) if(g[i]==='1') for(let a=0;a<S;a++)for(let b=0;b<S;b++){
      if(R()<o.drop)continue;
      dots.push({x:((x+i%5)*S+a+1)*p+p/2,y:(Math.floor(i/5)*S+b+1)*p+p/2,c:o.color,k:o.keyline,t:Math.round(R()*900)});
    } x+=6; }
  const W=(Math.max(x-1,1)*S+2)*p,H=(7*S+2)*p;
  for(let i=0;i<o.stray;i++){const sx=Math.floor(R()*(W/p)),sy=Math.floor(R()*(H/p));dots.push({x:sx*p+p/2,y:sy*p+p/2,c:R()<.6?o.color:'#C9B3FF',k:R()<.5,t:Math.round(R()*900)})}
  draw(svg,dots,W,H,p,svg.classList.contains('dots'));
  svg.setAttribute('preserveAspectRatio','xMinYMid meet');
}
/* small pixel marks for section heads */
function glyph(svg,seed){
  const R=rng(seed),p=14,dots=[];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++) if(R()<.62) dots.push({x:x*p+p/2,y:y*p+p/2,c:R()<.75?'#8C52FF':'#C9B3FF',k:true});
  draw(svg,dots,4*p,4*p,p,false);
}
/* constellation: Vancouver to the world */
function map(){
  const svg=document.getElementById('map'),tall=matchMedia('(max-width:700px)').matches;
  const W=tall?900:1600,H=tall?880:520,p=tall?22:14,R=rng(77),dots=[],fs=tall?40:26,nr=tall?[12.5,8]:[8.3,5.2];
  const pr=tall?(lat,lon)=>[60+((lon+125)/140)*(W-200),110+((56-lat)/52)*(H-200)]:(lat,lon)=>[((lon+140)/180)*W,((64-lat)/66)*H];
  for(let i=0;i<(tall?420:520);i++) dots.push({x:Math.floor(R()*W/p)*p+p/2,y:Math.floor(R()*H/p)*p+p/2,c:'#2E2148'});
  const V=pr(49.28,-123.12),A=pr(49.05,-122.31),B=pr(52.52,13.40),L=pr(6.52,3.38);
  const line=(a,b,bend)=>{const n=Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/(tall?22:16));const mx=(a[0]+b[0])/2+(tall?bend:0),my=Math.min(a[1],b[1])-(tall?40:90);
    for(let i=1;i<n;i++){const t=i/n,x=(1-t)*(1-t)*a[0]+2*(1-t)*t*mx+t*t*b[0],y=(1-t)*(1-t)*a[1]+2*(1-t)*t*my+t*t*b[1];dots.push({x,y,c:'#C9B3FF',r:tall?3.4:2.2})}};
  line(V,B,0);line(V,L,-160);
  let s=`<rect width="${W}" height="${H}" fill="#1E1530"/>`;
  for(const d of dots) s+=`<circle cx="${d.x}" cy="${d.y}" r="${d.r||p*.33}" fill="${d.c}"/>`;
  const node=(pt,label,dx,dy,anchor)=>{let g='';for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){g+=`<circle cx="${pt[0]+a*p}" cy="${pt[1]+b*p}" r="${nr[0]}" fill="#fff"/>`}
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){g+=`<circle cx="${pt[0]+a*p}" cy="${pt[1]+b*p}" r="${nr[1]}" fill="#8C52FF"/>`}
    return g+`<text x="${pt[0]+dx}" y="${pt[1]+dy}" text-anchor="${anchor||'start'}" fill="#fff" font-family="Geist Mono, monospace" font-size="${fs}">${label}</text>`};
  if(tall) s+=node(V,'Vancouver',0,-52,'start')+node([A[0]+60,A[1]+90],'Abbotsford',48,12)+node(B,'Berlin',0,-52,'end')+node(L,'Lagos',-48,12,'end');
  else s+=node(V,'Vancouver',-28,-34)+node([A[0]+42,A[1]+56],'Abbotsford',34,8)+node(B,'Berlin',34,8)+node(L,'Lagos',34,8);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=s;
}

/* ---------- start-up: every block checks that its element exists, so one script serves every page ---------- */
let lastTall=null;
if(document.getElementById('map')){map();lastTall=matchMedia('(max-width:700px)').matches;
  addEventListener('resize',()=>{const t=matchMedia('(max-width:700px)').matches;if(t!==lastTall){lastTall=t;map()}});}
document.querySelectorAll('[data-scatter]').forEach(s=>scatter(s,JSON.parse(s.dataset.scatter)));
document.querySelectorAll('[data-text]').forEach(s=>dotText(s,s.dataset.text,JSON.parse(s.dataset.o)));
document.querySelectorAll('[data-glyph]').forEach(s=>glyph(s,+s.dataset.glyph));

/* light things up as they come into view */
(function(){
  const els=document.querySelectorAll('svg.dots,.reveal,.wall');
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('lit'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('lit');io.unobserve(e.target)}}),{threshold:.2});
  els.forEach(e=>io.observe(e));
  document.querySelectorAll('.roles li').forEach((li,i)=>li.style.transitionDelay=(i*70)+'ms');
})();

/* reading progress on long pages */
(function(){
  const bar=document.getElementById('bar'),art=document.querySelector('[data-progress]');if(!bar||!art)return;
  function upd(){const r=art.getBoundingClientRect(),t=Math.max(1,r.height-innerHeight);bar.style.width=Math.min(100,Math.max(0,-r.top/t*100))+'%'}
  addEventListener('scroll',upd,{passive:true});upd();
})();

/* photo strip buttons */
document.querySelectorAll('.strip-btns button').forEach(b=>b.addEventListener('click',()=>{
  const reel=document.getElementById('reel'),f=reel&&reel.querySelector('figure');if(f)reel.scrollBy({left:(+b.dataset.dir)*(f.offsetWidth+18),behavior:'smooth'})}));

/* take the night apart: parts start in a pile, then are dealt out into the grid when the section is reached.
   FLIP: each card's grid slot is measured once, after icons and fonts are ready (and again only when the width changes),
   then only transform and opacity are animated, with the Web Animations API, so nothing triggers layout mid-animation. */
(function(){
  const grid=document.getElementById('parts'),btn=document.querySelector('.apart');if(!grid||!btn)return;
  const cards=[...grid.children],n=cards.length,still=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width:700px)');
  const canAnimate='animate' in Element.prototype,EASE='cubic-bezier(.2,.8,.2,1)',RISE='translateY(28px)',anims=new Map();
  let pile=[],width=0,piled=false,waiting=null,io=null;
  /* the transform that takes each card from its grid slot onto the pile. offset* ignores transforms, so this is right even mid-animation */
  function measure(){
    width=grid.clientWidth;const cx=width/2,cy=Math.min(grid.clientHeight/2,190);
    pile=cards.map((c,i)=>`translate(${(cx-c.offsetLeft-c.offsetWidth/2).toFixed(1)}px,${(cy-c.offsetTop-c.offsetHeight/2).toFixed(1)}px) rotate(${((i-(n-1)/2)*2.6).toFixed(1)}deg)`);
  }
  /* where a card is on screen right now; stops any animation it's in so the next one starts from there */
  function current(c){
    const a=anims.get(c);if(!a)return{transform:c.style.transform||'none',opacity:c.style.opacity||'1'};
    const cs=getComputedStyle(c),now={transform:cs.transform,opacity:cs.opacity};a.cancel();anims.delete(c);return now;
  }
  /* animate a batch of cards from→to, each starting `step` ms after the last. The stagger is built into the keyframes
     (hold, then ease, then hold) rather than given as per-card delays, so every card starts together with one shared
     duration and the whole batch runs on the compositor. will-change is on for the batch and off when the last card lands */
  function play(list,dur,step){
    const total=dur+step*Math.max(...list.map(x=>x.order));
    list.forEach(x=>{
      const s=x.order*step/total,e=(x.order*step+dur)/total;
      x.c.style.willChange=x.from.opacity===x.to.opacity?'transform':'transform, opacity';
      x.a=x.c.animate([{...x.from,offset:0},{...x.from,offset:s,easing:EASE},{...x.to,offset:e},{...x.to,offset:1}],{duration:total});
      anims.set(x.c,x.a);
    });
    Promise.all(list.map(x=>x.a.finished)).then(()=>list.forEach(x=>{if(anims.get(x.c)===x.a)anims.delete(x.c);x.c.style.willChange=''}),()=>{});
  }
  function label(){btn.setAttribute('aria-pressed',String(piled));btn.textContent=piled?'Take the night apart':'Put the night back together'}
  /* pile up or deal out. Cards leave the top of the pile first, and the bottom card lands first when gathering */
  function move(toPile,instant){
    piled=toPile;label();
    if(waiting){waiting=null;if(io)io.disconnect()}
    const list=cards.map((c,i)=>{
      const from=current(c);c.style.transform=toPile?pile[i]:'';c.style.opacity='';c.style.willChange='';
      return{c,from,to:{transform:toPile?pile[i]:'none',opacity:'1'},order:toPile?i:n-1-i};
    });
    if(!instant&&!still.matches&&canAnimate)phone.matches?play(list,520,40):play(list,700,50);
  }
  /* phones: no pile on the way in. Cards rise and fade into place as they scroll into view, a few at a time */
  function rise(){
    waiting='rise';
    cards.forEach(c=>{c.style.opacity='0';c.style.transform=RISE});
    io=new IntersectionObserver(es=>{
      const list=es.filter(e=>e.isIntersecting).map(e=>e.target).sort((a,b)=>cards.indexOf(a)-cards.indexOf(b)).map((c,k)=>{
        io.unobserve(c);c.style.opacity='';c.style.transform='';
        return{c,from:{transform:RISE,opacity:'0'},to:{transform:'none',opacity:'1'},order:k};
      });
      if(list.length)play(list,450,50);
    },{rootMargin:'0px 0px -8% 0px'});
    cards.forEach(c=>io.observe(c));
  }
  /* desktop: start in a pile, deal out once the section is well into view */
  function deal(){
    move(true,true);waiting='pile';
    io=new IntersectionObserver(es=>{if(!es[0].isIntersecting)return;io.disconnect();
      setTimeout(()=>{if(waiting==='pile'){waiting=null;move(false)}},650)},{rootMargin:'0px 0px -45% 0px'});
    io.observe(grid);
  }
  const ready=Promise.all([document.fonts?document.fonts.ready:0,...[...grid.querySelectorAll('img')].map(i=>i.decode?i.decode().catch(()=>{}):0)]);
  btn.addEventListener('click',()=>ready.then(()=>{if(!width)measure();move(!piled)}));
  ready.then(()=>{
    measure();
    // nothing to animate in: reduced motion, old browsers, or the section is already on screen (moving it now would be a jump)
    if(still.matches||!canAnimate||!('IntersectionObserver' in window)||grid.getBoundingClientRect().top<innerHeight)return;
    phone.matches?rise():deal();
  });
  /* only re-measure when the grid's width actually changes (not on scroll, and not when a phone's address bar hides) */
  let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{
    if(!width||grid.clientWidth===width)return;
    anims.forEach(a=>a.finish());measure();
    if(waiting==='rise'&&!phone.matches){io.disconnect();waiting=null;cards.forEach(c=>{c.style.opacity='';c.style.transform=''})}
    else if(piled)cards.forEach((c,i)=>c.style.transform=pile[i]);
  },150)});
})();

/* call for creatives form */
(function(){
  const f=document.getElementById('cf');if(!f)return;
  const story=document.getElementById('story'),box=document.getElementById('pdots'),txt=document.getElementById('ptext');
  story.addEventListener('input',()=>document.getElementById('story-c').textContent=story.value.length+' / 800');
  box.innerHTML='<i></i>'.repeat(8);
  function count(){
    const a=[true,!!(f.name.value.trim()&&f.email.value.trim()),!!(f.ig.value.trim()||f.city.value.trim()),!!f.querySelector('input[name=what]:checked'),!!f.link.value.trim(),f.story.value.trim().length>=40,true,f.ok.checked];
    const n=a.filter(Boolean).length;[...box.children].forEach((d,i)=>d.classList.toggle('on',a[i]));txt.textContent=n===8?'All 8 answered. Ready to send.':n+' of 8 answered';
  }
  f.addEventListener('input',count);f.addEventListener('change',count);count();
  f.querySelectorAll('input[name=for]').forEach(r=>r.addEventListener('change',()=>{
    const o=f.for.value==='other';
    document.getElementById('who-l').textContent=o?'Who should we credit? (them, and you)':'Who should we credit?';
    document.getElementById('name-l').textContent=o?'Their name or artist name':'Name or artist name';
    document.getElementById('what-l').textContent=o?'What do they do?':'What do you do?';
    document.getElementById('story-l').textContent=o?'Tell us about a night they built':'Tell us about a night you built';
    document.getElementById('ok-t').textContent=o?"I'm sharing public work or have their permission, and STRUKT can contact me about them.":'I made this work or have permission to share it, and STRUKT can contact me about a feature.';
  }));
  function err(id,msg){document.getElementById(id+'-e').textContent=msg;const el=document.getElementById(id);msg?el.setAttribute('aria-invalid','true'):el.removeAttribute('aria-invalid');return !msg}
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const ok=[
      err('name',f.name.value.trim()?'':'Add a name or artist name so we know who to credit.'),
      err('email',/^\S+@\S+\.\S+$/.test(f.email.value)?'':'Add an email address we can reach you at.'),
      err('what',f.querySelectorAll('input[name=what]:checked').length?'':'Pick at least one thing you do.'),
      err('link',/^https?:\/\/\S+\.\S+/.test(f.link.value)?'':'Add a link that starts with https:// so we can see the work.'),
      err('story',f.story.value.trim().length>=40?'':'Tell us a little more. A few sentences is enough.'),
      err('ok',f.ok.checked?'':'Tick this box so we can contact you.')
    ];
    if(ok.includes(false)){(f.querySelector('[aria-invalid=true]')||document.getElementById('ok')).focus();return}
    // TODO: send the form somewhere before launch, e.g. fetch('/api/submit',{method:'POST',body:new FormData(f)})
    f.hidden=true;document.querySelector('.prog8').hidden=true;const d=document.getElementById('done');d.hidden=false;d.focus();
  });
})();
