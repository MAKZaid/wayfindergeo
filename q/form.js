/* WayfinderGEO client question forms.
   Each /q/<client>/index.html holds a <script type="application/json" id="form-config"> and loads this file.
   Question types: choice, multi, hours, date, confirm, text, longtext, email.
   Answers save in the browser as you go and are sent through Formspree at the end. */
(function(){
  var C=JSON.parse(document.getElementById('form-config').textContent);
  var KEY='wfg-form-'+C.slug;
  var Q=C.questions;
  var DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var DAYNAME={Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',Sat:'Saturday',Sun:'Sunday'};
  var UNSURE=C.unsureLabel||'Not sure';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  var S={pos:-1,a:{},sent:false}; // pos -1 = welcome, list().length = review
  var resumed=false;
  try{ var s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s&&s.a){ S=s; resumed=!S.sent&&Object.keys(S.a).length>0; if(!S.sent) S.pos=-1; } }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }

  var I={
    arrow:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4"/></svg>',
    tick:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3L12.5 5"/></svg>',
    left:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>',
    right:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>',
    clock:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.4 1.6"/></svg>',
    star:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 2c1.6 15.5 8.5 28.4 30 30-21.5 1.6-28.4 14.5-30 30-1.6-15.5-8.5-28.4-30-30 21.5-1.6 28.4-14.5 30-30z"/></svg>'
  };

  var root=document.getElementById('form'), bar=document.querySelector('.f-progress i'),
      up=document.querySelector('[data-up]'), down=document.querySelector('[data-down]'), live=document.getElementById('live'), nav=document.querySelector('.f-nav');

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function h(tag,cls,html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function btn(cls,html){ var b=h('button',cls,html); b.type='button'; return b; }
  function fmt(t){ var hr=Math.floor(t), m=Math.round((t-hr)*60), ap=hr>=12&&hr<24?'pm':'am', h12=hr%12===0?12:hr%12; return h12+(m?':'+(m<10?'0':'')+m:'')+' '+ap; }
  function ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function parse(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function nice(s){ return parse(s).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }

  function visible(q){ var w=q.when; if(!w) return true; var a=S.a[w.q]; if(!a||a.unsure) return false;
    var v=a.pick!=null?[a.pick]:(a.picks||[]);
    if(w.is) return v.some(function(x){ return w.is.indexOf(x)>-1; });
    if(w.not) return !v.some(function(x){ return w.not.indexOf(x)>-1; });
    return true; }
  function list(){ return Q.filter(visible); }

  function done(q){ var v=S.a[q.id]; if(!v) return !!q.optional; if(v.unsure) return true;
    switch(q.type){
      case 'choice': return v.pick!=null&&(v.pick!==q.other||!!(v.other||'').trim());
      case 'multi': return (v.picks||[]).length>0&&(v.picks.indexOf(q.other)<0||!!(v.other||'').trim());
      case 'hours': return v.choice==='yes'||v.choice==='change';
      case 'date': return !!v.call||(v.dates||[]).length>0;
      case 'confirm': return v.ok===true||(v.ok===false&&!!(v.value||'').trim());
      case 'email': return /.+@.+\..+/.test(v.text||'');
      default: return !!q.optional||!!(v.text||'').trim();
    } }

  function hoursText(hs){ return DAYS.map(function(d){ return d+' '+(hs[d]?fmt(hs[d][0])+' to '+fmt(hs[d][1]):'closed'); }).join(', '); }
  function answerText(q){ var v=S.a[q.id]; if(!v) return q.optional?'Nothing':'Skipped'; if(v.unsure) return UNSURE;
    switch(q.type){
      case 'choice': return v.pick===q.other?q.other+': '+(v.other||''):(v.pick||'Skipped');
      case 'multi': return (v.picks||[]).map(function(p){ return p===q.other?p+': '+(v.other||''):p; }).join(', ')||'Skipped';
      case 'hours': return v.choice==='yes'?'As shown ('+hoursText(q.prefill)+')':v.choice==='change'?hoursText(v.hours):'Skipped';
      case 'date': return v.call?(q.callOption||'Call me'):(v.dates||[]).map(nice).join(', ')||'Skipped';
      case 'confirm': return v.ok?q.prefill:(v.value||'Skipped');
      default: return v.text||(q.optional?'Nothing':'Skipped');
    } }

  // ---------- screens ----------
  var dir='', still=false;
  function rerender(){ still=true; render(); still=false; }
  function show(pos,back){
    var old=root.firstElementChild; dir=back?' back':'';
    var go=function(){ S.pos=pos; save(); render(); window.scrollTo(0,0); };
    if(old&&!reduce){ old.className+=' out'+dir; setTimeout(go,190); } else go();
  }

  function render(){
    root.innerHTML='';
    var L=list(), n=L.length, card=h('div','f-card'+(still?'':' in'+dir)); root.appendChild(card);
    bar.style.width=(S.sent?100:S.pos<0?0:S.pos>=n?100:S.pos/n*100)+'%';
    nav.style.visibility=(S.pos<0||S.pos>=n||S.sent)?'hidden':'';
    up.disabled=S.pos<=0; down.disabled=!(S.pos>=0&&S.pos<n&&done(L[S.pos]));
    if(S.sent) return renderDone(card);
    if(S.pos<0) return renderWelcome(card);
    if(S.pos>=n) return renderReview(card,L);
    renderQuestion(card,L[S.pos],S.pos+1,n);
  }

  function renderWelcome(card){
    card.className+=' f-welcome';
    var parts=(C.parts||[]).map(function(t,i){ return '<div><b>'+(i+1)+'</b>'+esc(t)+'</div>'; }).join('');
    card.innerHTML=(C.greeting?'<div class="f-meta"><p class="f-eyebrow">'+esc(C.greeting)+'</p></div>':'')+'<h1 class="f-title">'+esc(C.title)+'</h1>'+
      '<p class="f-lead">'+esc(C.intro)+'</p>'+(parts?'<div class="f-parts">'+parts+'</div>':'')+
      '<div class="f-okrow f-startrow"><button class="f-btn big" type="button" data-start>'+(resumed?'Carry on':'Start')+I.arrow+'</button><span class="f-time">'+I.clock+'About '+(C.minutes||5)+' minutes</span></div>'+
      (resumed?'<p class="f-resume">Your earlier answers are saved. <button type="button" data-restart>Start over</button></p>':'')+
      (C.note?'<p class="f-resume">'+esc(C.note)+'</p>':'');
    card.querySelector('[data-start]').addEventListener('click',function(){
      if(!resumed){ show(0); return; }
      var L=list(), k=0; while(k<L.length&&done(L[k])) k++; show(k);
    });
    var r=card.querySelector('[data-restart]'); if(r) r.addEventListener('click',function(){ S={pos:-1,a:{},sent:false}; resumed=false; save(); render(); });
  }

  function choiceButton(label,key,on,extra){
    var b=btn('f-choice'+(extra||''),'<span class="f-key">'+key+'</span><span>'+esc(label)+'</span><span class="f-tick">'+I.tick+'</span>');
    b.setAttribute('aria-pressed',on); b.dataset.key=key; return b;
  }

  function renderQuestion(card,q,num,total){
    var v=S.a[q.id], ok;
    card.appendChild(h('div','f-meta','<p class="f-eyebrow">'+esc(q.group||'')+'</p><span class="f-step">'+num+' of '+total+'</span>'));
    card.appendChild(h('h1','f-title',esc(q.title))).id='qt';
    if(q.help) card.appendChild(h('p','f-help',esc(q.help)));
    var body=h('div','f-body'); card.appendChild(body);

    function refresh(){ var d=done(q); if(ok){ ok.disabled=!d; ok.innerHTML=(q.optional&&!(S.a[q.id]&&S.a[q.id].text)?'Skip':'OK'); } down.disabled=!d; }
    // a tap saves the answer and shows it as chosen; only OK (or Enter) moves on
    function picked(b){ var k=b&&b.dataset.key, inCal=b&&b.closest('.f-cal-alt'); rerender();
      var f=root.querySelector((inCal?'.f-cal-alt ':'')+'.f-choice[data-key="'+k+'"]'); if(f) f.focus(); }

    if(q.type==='choice'||q.type==='multi'){
      var multi=q.type==='multi';
      if(!v||(multi&&!v.picks&&!v.unsure)) v=S.a[q.id]=multi?{picks:[]}:{};
      if(multi) body.appendChild(h('p','f-hint','Choose as many as you like'));
      var opts=q.options.slice(); if(q.other) opts.push(q.other); if(!q.noUnsure) opts.push(UNSURE);
      var wrap=h('div','f-choices'+(q.cols?' cols':'')); wrap.setAttribute('role','group'); wrap.setAttribute('aria-labelledby','qt');
      opts.forEach(function(o,i){
        var isU=!q.noUnsure&&i===opts.length-1, key=String.fromCharCode(65+i);
        var on=isU?!!v.unsure:multi?(v.picks||[]).indexOf(o)>-1:v.pick===o;
        var b=choiceButton(o,key,on,isU?' unsure':'');
        b.addEventListener('click',function(){
          if(isU){ S.a[q.id]={unsure:true}; save(); picked(b); return; }
          if(multi){ if(v.unsure||!v.picks) v=S.a[q.id]={picks:[]};
            var k=v.picks.indexOf(o);
            if(k>-1) v.picks.splice(k,1);
            else{ if(q.exclusive&&q.exclusive.indexOf(o)>-1) v.picks=[]; else if(q.exclusive) v.picks=v.picks.filter(function(p){ return q.exclusive.indexOf(p)<0; }); v.picks.push(o); }
            save(); picked(b); return; }
          v=S.a[q.id]={pick:o,other:v.other}; save();
          picked(b);
        });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      if(q.other&&!v.unsure&&(multi?(v.picks||[]).indexOf(q.other)>-1:v.pick===q.other)){
        var inp=h('input','f-input f-other'); inp.type='text'; inp.placeholder=q.otherPlaceholder||'Type your answer here'; inp.value=v.other||'';
        inp.addEventListener('input',function(){ v.other=inp.value; save(); refresh(); });
        body.appendChild(inp); setTimeout(function(){ inp.focus(); },60);
      }
    }

    if(q.type==='hours'){
      if(!v) v=S.a[q.id]={};
      body.appendChild(h('div','f-known',(q.prefillRows||[]).map(function(r){ return '<div><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'; }).join('')));
      var wrap=h('div','f-choices cols long');
      [['Yes, that\'s right','yes'],['No, change them','change']].concat(q.noUnsure?[]:[[UNSURE,'unsure']]).forEach(function(p,i){
        var on=p[1]==='unsure'?!!v.unsure:v.choice===p[1], b=choiceButton(p[0],String.fromCharCode(65+i),on,p[1]==='unsure'?' unsure':'');
        if(p[1]==='unsure') b.style.gridColumn='1 / -1';
        b.addEventListener('click',function(){
          if(p[1]==='unsure'){ S.a[q.id]={unsure:true}; save(); picked(b); return; }
          v=S.a[q.id]={choice:p[1],hours:v.hours||JSON.parse(JSON.stringify(q.prefill))}; save();
          picked(b);
        });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      if(v.choice==='change'){
        body.appendChild(h('p','f-hint','<span style="display:block;margin-top:18px">Tap a day to change it</span>'));
        var days=h('div','f-days');
        DAYS.forEach(function(d){
          var hr=v.hours[d], row=btn('f-day'+(hr?'':' closed'),'<b>'+DAYNAME[d]+'</b><span>'+(hr?fmt(hr[0])+' to '+fmt(hr[1]):'Closed')+'</span><i>Edit</i>');
          row.addEventListener('click',function(){ hoursSheet(d,v.hours[d],function(val){ v.hours[d]=val; save(); rerender(); }); });
          days.appendChild(row);
        });
        body.appendChild(days);
      }
    }

    if(q.type==='date'){
      if(!v||v.unsure) v=S.a[q.id]={dates:[]};
      if(!v.dates) v.dates=[];
      body.appendChild(calendar(q,v,function(){ save(); refresh(); }));
      if(q.callOption){
        var alt=h('div','f-choices f-cal-alt'), b=choiceButton(q.callOption,'A',!!v.call);
        b.addEventListener('click',function(){ v.call=!v.call; if(v.call) v.dates=[]; save(); picked(b); });
        alt.appendChild(b); body.appendChild(alt);
      }
    }

    if(q.type==='confirm'){
      if(!v) v=S.a[q.id]={};
      body.appendChild(h('div','f-known','<div><b style="text-align:left">'+esc(q.prefill)+'</b></div>'));
      var wrap=h('div','f-choices cols long');
      [['Yes','ok'],['Use a different one','change']].forEach(function(p,i){
        var b=choiceButton(p[0],String.fromCharCode(65+i),p[1]==='ok'?v.ok===true:v.ok===false);
        b.addEventListener('click',function(){ v=S.a[q.id]={ok:p[1]==='ok',value:v.value}; save();
          picked(b); });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      if(v.ok===false){ var inp=h('input','f-input f-other'); inp.type=q.inputType||'text'; inp.value=v.value||''; inp.placeholder='Type it here';
        inp.addEventListener('input',function(){ v.value=inp.value; save(); refresh(); }); body.appendChild(inp); setTimeout(function(){ inp.focus(); },60); }
    }

    if(q.type==='text'||q.type==='longtext'||q.type==='email'){
      var long=q.type==='longtext', inp=h(long?'textarea':'input','f-input');
      if(!long) inp.type=q.type==='email'?'email':'text';
      inp.placeholder=q.placeholder||'Type your answer here'; inp.value=(v&&v.text)||''; inp.setAttribute('aria-labelledby','qt');
      var grow=function(){ if(long){ inp.style.height='auto'; inp.style.height=Math.max(120,inp.scrollHeight)+'px'; } };
      inp.addEventListener('input',function(){ S.a[q.id]={text:inp.value}; save(); grow(); refresh(); });
      body.appendChild(inp); setTimeout(function(){ grow(); if(matchMedia('(hover:hover)').matches) inp.focus(); },60);
      if(long) body.appendChild(h('p','f-hint','<span style="display:block;margin-top:8px">Shift + Enter for a new line</span>'));
    }

    // OK: glass until the question is answered, orange once it is
    var row=h('div','f-okrow'); ok=btn('f-btn',''); ok.addEventListener('click',next);
    row.appendChild(ok); row.appendChild(h('span','f-enter','press <b>Enter &crarr;</b>'));
    if(num>1){ var bk=btn('f-back',I.left+'<span class="sr-only">Back</span>'); bk.addEventListener('click',prev); row.appendChild(bk); }
    body.appendChild(row);
    refresh();
    live.textContent='Question '+num+' of '+total+': '+q.title;
  }

  // ---------- calendar (brief: beUI Date Range Picker) ----------
  function calendar(q,v,changed){
    var today=new Date(); today.setHours(0,0,0,0);
    var min=new Date(today); min.setDate(min.getDate()+(q.minDaysAhead==null?1:q.minDaysAhead));
    var max=new Date(today); max.setDate(max.getDate()+(q.maxDaysAhead||60));
    var closed=q.closedWeekdays||[]; var limit=q.max||3;
    var first=v.dates.length?parse(v.dates[0]):min, view=new Date(first.getFullYear(),first.getMonth(),1);
    var box=h('div','f-cal'), head=h('div','f-cal-head'), grid=h('div','f-cal-grid'), foot=h('div','f-cal-foot');
    var title=h('b'), navw=h('div','f-cal-nav'), prev=btn('',I.left), nxt=btn('',I.right);
    prev.setAttribute('aria-label','Previous month'); nxt.setAttribute('aria-label','Next month');
    navw.appendChild(prev); navw.appendChild(nxt); head.appendChild(title); head.appendChild(navw);
    box.appendChild(head); box.appendChild(grid); box.appendChild(foot);
    function draw(slide){
      title.textContent=view.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      prev.disabled=view<=new Date(min.getFullYear(),min.getMonth(),1);
      nxt.disabled=new Date(view.getFullYear(),view.getMonth()+1,1)>max;
      grid.className='f-cal-grid'+(slide&&!reduce?' slide-'+slide:'');
      grid.innerHTML=['S','M','T','W','T','F','S'].map(function(d){ return '<span class="wd">'+d+'</span>'; }).join('');
      var start=view.getDay(), dim=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
      for(var i=0;i<42;i++){
        var day=i-start+1;
        if(day<1||day>dim){ grid.appendChild(h('span')); continue; }
        var d=new Date(view.getFullYear(),view.getMonth(),day), key=ymd(d);
        var off=d<min||d>max||closed.indexOf(d.getDay())>-1, on=v.dates.indexOf(key)>-1;
        var b=btn('f-cal-day'+(d.getTime()===today.getTime()?' today':''),String(day));
        b.disabled=off; b.setAttribute('aria-pressed',on);
        b.setAttribute('aria-label',d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+(off?', not available':''));
        (function(key){ b.addEventListener('click',function(){
          var k=v.dates.indexOf(key);
          if(k>-1) v.dates.splice(k,1); else { if(v.dates.length>=limit) v.dates.shift(); v.dates.push(key); v.dates.sort(); }
          v.call=false; var alt=root.querySelector('.f-cal-alt .f-choice'); if(alt) alt.setAttribute('aria-pressed','false');
          draw(); changed(); }); })(key);
        grid.appendChild(b);
      }
      foot.innerHTML='<span>'+(v.dates.length?v.dates.length+' picked: '+v.dates.map(nice).join(', '):'Pick up to '+limit)+'</span>';
      if(v.dates.length){ var c=btn('','Clear'); c.addEventListener('click',function(){ v.dates=[]; draw(); changed(); }); foot.appendChild(c); }
    }
    prev.addEventListener('click',function(){ view=new Date(view.getFullYear(),view.getMonth()-1,1); draw('r'); });
    nxt.addEventListener('click',function(){ view=new Date(view.getFullYear(),view.getMonth()+1,1); draw('l'); });
    draw();
    return box;
  }

  // ---------- hours sheet with wheels (brief: beUI Bottom Sheet + Wheel Picker) ----------
  function hoursSheet(day,val,commit){
    var TIMES=[]; for(var t=5;t<=23;t+=.5) TIMES.push(t);
    var open=val?val[0]:10, close=val?val[1]:18, isClosed=!val;
    var scrim=h('div','f-scrim'), sheet=h('div','f-sheet'); sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-label',DAYNAME[day]+' hours');
    sheet.innerHTML='<div class="f-grab"></div><h2>'+DAYNAME[day]+'</h2><p class="sub">Spin to set when you open and close.</p>';
    var wheels=h('div','f-wheels'+(isClosed?' off':''));
    var w1=h('div'), w2=h('div'); w1.appendChild(h('label',null,'Opens')); w2.appendChild(h('label',null,'Closes'));
    w1.appendChild(wheel(TIMES,open,function(x){ open=x; },'Opens')); w2.appendChild(wheel(TIMES,close,function(x){ close=x; },'Closes'));
    wheels.appendChild(w1); wheels.appendChild(w2); sheet.appendChild(wheels);
    var sw=h('div','f-switch','<span>Closed all day</span>'), tg=btn('f-toggle',''); tg.setAttribute('role','switch'); tg.setAttribute('aria-checked',isClosed); tg.setAttribute('aria-label','Closed all day');
    tg.addEventListener('click',function(){ isClosed=!isClosed; tg.setAttribute('aria-checked',isClosed); wheels.classList.toggle('off',isClosed); });
    sw.appendChild(tg); sheet.appendChild(sw);
    var doneB=btn('f-btn','Done'); sheet.appendChild(doneB);
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ scrim.classList.add('on'); sheet.classList.add('on'); }); });
    function close_(keep){ if(keep) commit(isClosed?null:[Math.min(open,close),Math.max(open,close)]);
      scrim.classList.remove('on'); sheet.classList.remove('on'); document.removeEventListener('keydown',onKey);
      setTimeout(function(){ scrim.remove(); sheet.remove(); },reduce?0:380); }
    function onKey(e){ if(e.key==='Escape') close_(false); }
    document.addEventListener('keydown',onKey);
    scrim.addEventListener('click',function(){ close_(false); });
    doneB.addEventListener('click',function(){ close_(true); });
    setTimeout(function(){ doneB.focus(); },50);
  }

  function wheel(opts,value,onChange,label){
    var ROW=40, el=h('div','f-wheel'); el.appendChild(h('div','band'));
    el.tabIndex=0; el.setAttribute('role','spinbutton'); el.setAttribute('aria-label',label);
    var rows=opts.map(function(o){ var r=h('div','row',fmt(o)); el.appendChild(r); return r; });
    var pos=Math.max(0,opts.indexOf(value)), anim=null, last=-1;
    function paint(){
      var sel=Math.round(Math.max(0,Math.min(opts.length-1,pos)));
      rows.forEach(function(r,i){ var d=i-pos, a=Math.abs(d);
        if(a>3.2){ if(r.style.visibility!=='hidden') r.style.visibility='hidden'; return; }
        r.style.visibility='';
        r.style.transform='translateY('+(d*ROW*.92)+'px) rotateX('+(-d*21)+'deg)';
        r.style.opacity=String(Math.max(0,1-a*.28));
        r.classList.toggle('sel',i===sel); });
      if(sel!==last){ last=sel; el.setAttribute('aria-valuetext',fmt(opts[sel])); onChange(opts[sel]); }
    }
    function to(target){
      target=Math.max(0,Math.min(opts.length-1,Math.round(target)));
      cancelAnimationFrame(anim); if(reduce){ pos=target; paint(); return; }
      var from=pos, t0=performance.now(), dur=Math.min(520,180+Math.abs(target-from)*40);
      (function step(now){ var k=Math.min(1,(now-t0)/dur), c=1.4, e=1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);
        pos=from+(target-from)*e; paint(); if(k<1) anim=requestAnimationFrame(step); else { pos=target; paint(); } })(t0);
    }
    var startY=0, startPos=0, hist=[], drag=false;
    el.addEventListener('pointerdown',function(e){ drag=true; cancelAnimationFrame(anim); startY=e.clientY; startPos=pos; hist=[[e.timeStamp,e.clientY]]; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove',function(e){ if(!drag) return; var p=startPos-(e.clientY-startY)/ROW;
      if(p<0) p*=.3; if(p>opts.length-1) p=opts.length-1+(p-opts.length+1)*.3;
      pos=p; hist.push([e.timeStamp,e.clientY]); if(hist.length>6) hist.shift(); paint(); });
    function release(e){ if(!drag) return; drag=false;
      if(Math.abs(e.clientY-startY)<4){ var r=el.getBoundingClientRect(); to(pos+Math.round((e.clientY-(r.top+r.height/2))/ROW)); return; }
      var a=hist[0], b=hist[hist.length-1], dt=Math.max(1,b[0]-a[0]), vel=-(b[1]-a[1])/dt/ROW;
      vel=Math.max(-.06,Math.min(.06,vel)); to(pos+vel*240); }
    el.addEventListener('pointerup',release); el.addEventListener('pointercancel',release);
    var wt=null;
    el.addEventListener('wheel',function(e){ e.preventDefault(); cancelAnimationFrame(anim); pos=Math.max(-.4,Math.min(opts.length-.6,pos+e.deltaY/ROW*.6)); paint();
      clearTimeout(wt); wt=setTimeout(function(){ to(pos); },110); },{passive:false});
    el.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); to(pos+1); } if(e.key==='ArrowUp'){ e.preventDefault(); to(pos-1); } });
    paint();
    return el;
  }

  // ---------- review + done ----------
  function renderReview(card,L){
    card.innerHTML='<div class="f-meta"><p class="f-eyebrow">Last step</p></div><h1 class="f-title">Here\'s what you told us.</h1><p class="f-help">Tap Change to fix anything, then send it.</p>';
    var r=h('div','f-review');
    L.forEach(function(q,k){ var a=S.a[q.id], d=h('div',a&&!a.unsure?'':'skipped','<span>'+esc(q.title)+'</span><b>'+esc(answerText(q))+'</b>');
      var c=btn(null,'Change'); c.addEventListener('click',function(){ show(k,true); }); d.appendChild(c); r.appendChild(d); });
    card.appendChild(r);
    var row=h('div','f-okrow f-startrow'), b=btn('f-btn big','Send to '+esc(C.sendTo||'us')+I.arrow); row.appendChild(b); card.appendChild(row);
    var err=h('p','f-err'); err.hidden=true; card.appendChild(err);
    b.addEventListener('click',function(){
      b.disabled=true; b.innerHTML='Sending...';
      var data={_subject:C.subject||('Answers: '+C.client),_gotcha:'',client:C.client};
      L.forEach(function(q){ data[q.title]=answerText(q); });
      fetch(C.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
        .then(function(res){ if(!res.ok) throw new Error(res.status); S.sent=true; save(); show(S.pos); })
        .catch(function(){ b.disabled=false; b.innerHTML='Try again'+I.arrow; err.hidden=false;
          err.textContent='That didn\'t go through. Check your signal and try again. Your answers are still saved.'; });
    });
    live.textContent='Review your answers';
  }

  function renderDone(card){
    card.innerHTML='<div class="f-star">'+I.star+'</div><h1 class="f-title" style="font-size:clamp(2rem,5vw,3rem);letter-spacing:-.04em">'+esc(C.thanks.title)+'</h1>'+
      '<p class="f-help" style="margin-top:12px">'+esc(C.thanks.body)+'</p><p class="f-resume" style="margin-top:30px"><button type="button" data-again>Start a new set of answers</button></p>';
    document.querySelector('.f-saved').style.display='none';
    card.querySelector('[data-again]').addEventListener('click',function(){ S={pos:-1,a:{},sent:false}; resumed=false; save(); document.querySelector('.f-saved').style.display=''; render(); });
    live.textContent=C.thanks.title;
  }

  function next(){ var L=list(); if(S.pos>=0&&S.pos<L.length&&!done(L[S.pos])) return; show(Math.min(S.pos+1,L.length)); }
  function prev(){ if(S.pos>0) show(S.pos-1,true); }
  up.addEventListener('click',prev); down.addEventListener('click',next);

  document.addEventListener('keydown',function(e){
    if(S.sent||e.metaKey||e.ctrlKey||e.altKey||document.querySelector('.f-sheet')) return;
    var t=e.target, typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT');
    if(e.key==='Enter'){
      if(t&&t.tagName==='TEXTAREA'&&e.shiftKey) return;
      if(t&&t.tagName==='BUTTON'&&!t.classList.contains('f-choice')) return;
      e.preventDefault();
      if(S.pos<0){ var s=root.querySelector('[data-start]'); if(s) s.click(); return; }
      if(S.pos>=list().length) return;
      next(); return;
    }
    if(typing||S.pos<0) return;
    if(/^[a-z]$/i.test(e.key)){ var b=root.querySelector('.f-choice[data-key="'+e.key.toUpperCase()+'"]'); if(b){ e.preventDefault(); b.click(); } }
  });

  render();
})();
