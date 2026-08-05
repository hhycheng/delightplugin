/* ui.js — the panel. Views, state, and messaging with code.js.
   Reads everything from window.ENGINE and src/data. It never hardcodes a
   duration, a stage or a motion. */

(function () {
"use strict";

var E = window.ENGINE;
var PAT = window.PAT, VERBS = window.VERBS, STAGES = window.STAGES;
var DUR = window.DUR, EAS = window.EAS, ORDER = E.ORDER;

var ICON_RULE = "One unbroken movement, one property. Icon motion is judged on Natural first: "
  + "it should read as the thing behaving, not as an effect applied to it.";

var TESTS = [
  { k:"nat", l:"Natural",    p:"feels real",  n:"Nothing here needs to imitate a physical object." },
  { k:"fun", l:"Functional", p:"does a job",  n:"Not carrying information on its own." },
  { k:"exp", l:"Expressive", p:"right tone",  n:"Neutral by design. Not a focal moment." }
];

var S = {
  view:"empty", prevView:null,
  frame:null, extra:0, reading:false,
  dx:null, changing:false, aiNote:"",
  gi:null, picked:{}, applied:{},
  apiKey:"", keyDraft:"", keyStatus:null, testing:false
};

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function post(m){ parent.postMessage({ pluginMessage:m }, "*"); }
function tokVal(t){ return DUR[t] ? DUR[t].ms+"ms" : EAS[t] ? EAS[t].c : ""; }

/* --------------------------------------------------- messages from code.js */
window.onmessage = function (e) {
  var m = e.data.pluginMessage; if (!m) return;

  if (m.type === "frame") {
    S.frame = m.frame; S.extra = m.extra || 0;
    S.picked = {}; S.applied = {}; S.aiNote = "";
    if (!m.frame) { S.view = "empty"; S.dx = null; }
    else { S.view = "read"; readFrame(); }
    render();
  }
  if (m.type === "key") { S.apiKey = m.key || ""; render(); }
  if (m.type === "applied") {
    if (m.ok && m.key) S.applied[m.key] = m.viaMotion ? "motion" : "note";
    render();
  }
};

/* ------------------------------------------------------------- diagnosis
   Rules first. The model is asked only when the rules are unsure, and it
   can only answer with one of the five stages. */
function readFrame(){
  S.reading = true; render();
  var dx = E.diagnose(S.frame);

  if (dx.sure || !S.apiKey) {
    S.dx = dx; S.reading = false; S.changing = !dx.sure; render(); return;
  }
  window.CLAUDE.readStage(S.frame, STAGES, S.apiKey).then(function (r) {
    if (r) {
      S.dx = { stage:r.stage, sure:true, evidence:[r.why] };
      S.aiNote = "Read by Claude, because the frame name and its layers did not agree.";
    } else {
      S.dx = dx; S.changing = true;
    }
    S.reading = false; render();
  });
}

/* ------------------------------------------------------------- the curve */
function curve(active){
  var W=304,H=72,padX=28,top=10,bot=48, hs=E.heights();
  var pts=ORDER.map(function(id,i){
    return { id:id, x:padX+i*((W-padX-16)/(ORDER.length-1)), y:bot-hs[i]*(bot-top) };
  });
  var n=pts.length,h=[],d=[],i;
  for(i=0;i<n-1;i++){ h[i]=pts[i+1].x-pts[i].x; d[i]=(pts[i+1].y-pts[i].y)/h[i]; }
  var m=[d[0]];
  for(i=1;i<n-1;i++){
    if(d[i-1]*d[i]<=0) m[i]=0;
    else { var w1=2*h[i]+h[i-1], w2=h[i]+2*h[i-1]; m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]); }
  }
  m[n-1]=d[n-2];
  var p="M"+pts[0].x.toFixed(1)+" "+pts[0].y.toFixed(1);
  for(i=0;i<n-1;i++){
    p+=" C"+(pts[i].x+h[i]/3).toFixed(1)+" "+(pts[i].y+m[i]*h[i]/3).toFixed(1)
      +","+(pts[i+1].x-h[i]/3).toFixed(1)+" "+(pts[i+1].y-m[i+1]*h[i]/3).toFixed(1)
      +","+pts[i+1].x.toFixed(1)+" "+pts[i+1].y.toFixed(1);
  }
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" role="img" '
    +'aria-label="Where this moment sits across a journey, peaking at Confirm">'
    +'<path d="'+p+'" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>'
    +pts.map(function(q){
      var on=q.id===active;
      return '<circle cx="'+q.x+'" cy="'+q.y+'" r="'+(on?5:2.5)+'" fill="'
        +(on?"var(--aia)":"var(--line-2)")+'"/>'
        +'<text x="'+q.x+'" y="'+(bot+16)+'" font-size="8" text-anchor="middle" fill="'
        +(on?"var(--aia)":"var(--ink-3)")+'">'+q.id+'</text>'; }).join("")
    +'</svg>';
}

/* --------------------------------------------------------------- volume */
function volBar(p, target, stageLabel){
  var v=E.volumeOf(p), d=v.total-target, MX=E.VOL_MAX;
  var rows=[["Amplitude",v.a,MX.a],["Duration",v.d,MX.d],["Character",v.c,MX.c],["Choreography",v.o,MX.o]];
  var fit = Math.abs(d)<=1 ? "Sits where the curve asks for this stage."
          : d>1 ? "Louder than "+stageLabel.toLowerCase()+" usually asks for. Valid, but it will stand out."
          : "Quieter than "+stageLabel.toLowerCase()+" usually asks for. Valid, but it may go unnoticed.";
  var pct=function(n){ return (n/13*100).toFixed(1); };
  return '<div class="volwrap">'
    +'<div class="volhead"><span>Motion Volume</span><span>'+v.total+' of 13</span></div>'
    +'<div class="voltotal"><span class="voltotalfill" style="width:'+pct(v.total)+'%"></span>'
    +'<span class="voltarget" style="left:'+pct(target)+'%"></span></div>'
    +'<p class="volfit'+(Math.abs(d)<=1?' ok':'')+'">'+fit+' The curve asks for about '+target+' here.</p>'
    +rows.map(function(r){
      return '<div class="volrow"><span>'+r[0]+'</span>'
        +'<span class="voltrack"><span class="volfill" style="width:'+(r[1]/r[2]*100)+'%"></span></span>'
        +'<span class="volnum">'+r[1]+'</span></div>'; }).join("")
    +'</div>';
}

/* ---------------------------------------------------------------- views */
var V = {};
function render(){
  var b=$("body"), f=$("foot");
  b.scrollTop=0;
  (V[S.view]||V.empty)(b,f);
  var g=$("gear");
  g.style.display = (S.view==="settings") ? "none" : "";
  g.onclick = function(){ if(S.view!=="settings"){ S.prevView=S.view; S.view="settings"; render(); } };
}

V.empty = function(b,f){
  $("ttl").textContent="Delight Motion"; $("stp").textContent="";
  b.innerHTML='<h3>Select A Frame</h3>'
    +'<p class="lede">Pick the moment you want to work on. The plugin reads what is on it, '
    +'says what kind of moment it is, and suggests motion that fits.</p>';
  f.innerHTML='';
};

V.read = function(b,f){
  $("ttl").textContent=esc(S.frame.name); $("stp").textContent="Step 1 of 3";
  if(S.reading){
    b.innerHTML='<h3>Reading The Frame</h3><p class="lede"><span class="spin"></span> '
      +'Looking at what is on it to work out what kind of moment this is.</p>';
    f.innerHTML=''; return;
  }
  var st=STAGES[S.dx.stage];
  b.innerHTML=
    (S.dx.sure
      ? '<div class="diag"><div class="k">This Looks Like</div><h2>'+esc(st.label)+'</h2>'
        +'<p>'+esc(st.plain)+'</p></div>'
      : '<div class="flag warn"><b>Which Moment Is This?</b>'
        +'The frame name and its layers do not point clearly at one stage.</div>')
    + curve(S.dx.stage)
    + '<p class="note" style="text-align:center;margin:2px 0 10px">Where this sits across a journey. '
    + 'Higher means motion here can be more noticeable.</p>'
    + (S.dx.evidence.length
        ? '<div class="sec">Why</div>'+S.dx.evidence.map(function(e){
            return '<p class="evi">'+esc(e)+'</p>'; }).join("") : '')
    + (S.aiNote ? '<p class="note" style="margin-top:8px">'+esc(S.aiNote)+'</p>' : '')
    + (S.extra ? '<p class="note" style="margin-top:8px">'+S.extra
        +' other frame'+(S.extra>1?'s are':' is')+' selected. Only the first is being read.</p>' : '')
    + (S.changing
        ? '<div class="sec">Set The Moment</div><select id="sel">'
          + ORDER.map(function(k){ return '<option value="'+k+'"'+(k===S.dx.stage?' selected':'')+'>'
              +esc(STAGES[k].label)+'</option>'; }).join("")+'</select>'
        : '<p style="text-align:center;margin-top:12px">'
          +'<button class="link" id="ch">Not the right moment?</button></p>');

  if($("ch")) $("ch").onclick=function(){ S.changing=true; render(); };
  if($("sel")) $("sel").onchange=function(e){
    S.dx={ stage:e.target.value, sure:true, evidence:["You set this by hand."] };
    S.aiNote=""; S.picked={}; S.applied={}; render(); };

  f.innerHTML='<button class="primary" style="flex:1" id="nx">Confirm</button>';
  $("nx").onclick=function(){ S.view="rules"; render(); };
};

V.rules = function(b,f){
  var st=STAGES[S.dx.stage];
  var main=E.mainMotionOf(S.frame,S.dx.stage), gs=E.groups(S.frame);
  var mainLabel = main ? gs.filter(function(g){return g.key===main;})[0].label : null;
  var found=E.foundOn(S.frame);

  $("ttl").textContent=esc(st.label); $("stp").textContent="Step 2 of 3";
  b.innerHTML=
    '<div class="stagebar"><span class="k">Reading this as</span><b>'+esc(st.label)+'</b>'
    +'<button class="link" id="ch">Not the right moment?</button></div>'
    +'<h3>What That Means Here</h3>'
    +(st.quiet
      ? '<p class="lede">'+esc(st.quiet)+' That does not mean no motion. It means smaller dials, '
        +'not fewer moving parts.</p>'
      : '<p class="lede">'+esc(st.plain)+'</p>')
    +'<div class="sec">At This Stage</div>'
    +st.can.map(function(r){ return '<div class="rule yes"><span class="ic">&#10003;</span><span><b>'
      +esc(r[0])+'</b><span class="d">'+esc(r[1])+'</span></span></div>'; }).join("")
    +(mainLabel
      ? '<div class="rule yes"><span class="ic">&#10003;</span><span><b>'+esc(mainLabel)
        +' can be the main motion</b><span class="d">One motion stands out per moment. '
        +'Everything else on this frame stays supporting.</span></span></div>'
      : '<div class="rule no"><span class="ic">&#33;</span><span><b>Nothing stands out here</b>'
        +'<span class="d">No single element should lead at this stage.</span></span></div>')
    +st.cannot.map(function(r){ return '<div class="rule no"><span class="ic">&#33;</span><span><b>'
      +esc(r[0])+'</b><span class="d">'+esc(r[1])+'</span></span></div>'; }).join("")
    +(found.length ? '<div class="sec">On This Frame</div>'
      +found.map(function(r){ return '<div class="rule found"><span class="ic">&#8226;</span><span><b>'
        +esc(r.t)+'</b><span class="d">'+esc(r.d)+'</span></span></div>'; }).join("") : '');

  $("ch").onclick=function(){ S.changing=true; S.view="read"; render(); };
  f.innerHTML='<button id="bk">Back</button><button class="primary" style="flex:1" id="nx">Choose Motion</button>';
  $("bk").onclick=function(){ S.view="read"; render(); };
  $("nx").onclick=function(){ S.view="els"; render(); };
};

/* ---- apply, either as real keyframes or as a note ---- */
function applyGroup(g, id, isMain){
  var stage=S.dx.stage;
  var ids=S.frame.els.filter(function(e){
    return e.n.toLowerCase().replace(/[\s_-]*\d+$/,"").trim()===g.key.toLowerCase()
        || e.n===g.label; }).map(function(e){ return e.id; });
  if(!ids.length) ids=[g.el.id];
  var p=E.motionOf(id);
  post({ type:"apply", job:{
    groupKey:g.key, nodeIds:ids, kf:E.keyframesFor(id),
    annotation:{ frameId:S.frame.id, stage:stage,
      main: isMain ? g.label : "",
      items:[{ element:g.label+(g.count>1?" (all "+g.count+")":""),
               motion:p.name, detail:p.plain, tokens:p.tokens.join("  ·  ") }] }
  }});
}

V.els = function(b,f){
  var stage=S.dx.stage, gs=E.groups(S.frame), main=E.mainMotionOf(S.frame,stage);
  $("ttl").textContent=esc(S.frame.name); $("stp").textContent="Step 3 of 3";
  var done=0;

  b.innerHTML='<h3>Choose Motion</h3>'
    +'<p class="lede">Each one already has a suggestion. Apply it, or look at the alternatives first.</p>'
    +gs.map(function(g,i){
      var o=E.optionsFor(g,stage), chosen=S.picked[g.key], applied=S.applied[g.key];
      if(applied) done++;
      var shown = chosen || (o.lib ? null : o.ids[0]);
      var label = o.lib ? o.lib.name : (shown ? E.motionOf(shown).name : "No option");
      var alt = o.lib ? 0 : Math.max(0, o.ids.length-1);
      return '<div class="ecard'+(applied?' done':'')+'">'
        +'<div class="ehead"><span style="flex:1"><span class="nm">'+esc(g.label)
        +(g.count>1?' <span class="note">&times;'+g.count+'</span>':'')
        +(main===g.key?' <span class="pill">Main motion</span>':'')+'</span>'
        +'<span class="st">'+esc(label)
        +(o.lib?' &middot; from the library':chosen?' &middot; your pick':' &middot; suggested')
        +(applied==="note"?' &middot; placed as a note':'')+'</span></span>'
        +(applied?'<span class="pill k">Applied</span>':'')+'</div>'
        +'<div class="eact">'
        +'<button class="mini" data-g="'+i+'">'
        +(o.lib?'See the icon':(alt?'See '+alt+' other'+(alt>1?'s':''):'See details'))+'</button>'
        +'<button class="mini go" data-a="'+i+'">'
        +(applied?'Applied':(o.lib?'Insert':'Apply to canvas'))+'</button>'
        +'</div></div>'; }).join("")
    +'<p class="note" style="margin-top:8px">'+done+' of '+gs.length+' applied.</p>';

  Array.prototype.forEach.call(b.querySelectorAll("[data-g]"),function(x){
    x.onclick=function(){ S.gi=parseInt(x.dataset.g,10); S.view="opts"; render(); };});
  Array.prototype.forEach.call(b.querySelectorAll("[data-a]"),function(x){
    x.onclick=function(){
      var g=gs[parseInt(x.dataset.a,10)], o=E.optionsFor(g,stage);
      if(o.lib){ post({ type:"insert-icon", job:{ groupKey:g.key, key:o.lib.key, nodeIds:[g.el.id] } }); }
      else { if(!S.picked[g.key]) S.picked[g.key]=o.ids[0];
             applyGroup(g, S.picked[g.key], main===g.key); }
      x.textContent="…";
    };});

  var left=gs.length-done;
  f.innerHTML='<button id="bk">Back</button><button class="primary" style="flex:1" id="all"'
    +(left?'':' disabled')+'>'+(left?'Apply the remaining '+left:'All applied')+'</button>';
  $("bk").onclick=function(){ S.view="rules"; render(); };
  if(left) $("all").onclick=function(){
    gs.forEach(function(g){
      if(S.applied[g.key]) return;
      var o=E.optionsFor(g,stage);
      if(o.lib){ post({ type:"insert-icon", job:{ groupKey:g.key, key:o.lib.key, nodeIds:[g.el.id] } }); }
      else { if(!S.picked[g.key]) S.picked[g.key]=o.ids[0];
             applyGroup(g, S.picked[g.key], main===g.key); }
    });
    $("all").textContent="…";
  };
};

V.opts = function(b,f){
  var stage=S.dx.stage, st=STAGES[stage];
  var gs=E.groups(S.frame), g=gs[S.gi], o=E.optionsFor(g,stage);
  var main=E.mainMotionOf(S.frame,stage), isMain = main===g.key;
  $("ttl").textContent=esc(g.label); $("stp").textContent=esc(st.label);

  if(o.lib){
    b.innerHTML='<div class="libcard"><div class="ico"><span class="iconpv" id="ip-lib">'
      +(g.el.svg||"")+'</span></div>'
      +'<div class="t"><b>'+esc(o.lib.name)+'</b><br><code>'+esc(o.lib.key)+'</code></div></div>'
      +'<div class="flag lib"><b>This Already Exists In The Qi Library</b>'+esc(o.lib.note)
      +' Insert the component instead of building it by hand. It carries its own motion, '
      +'so it stays in step if the library changes.</div>'
      +'<p class="note">Nothing to choose here. The library made the decision.</p>';
    if($("ip-lib")) setTimeout(function(){ drawIcon("ip-lib"); },150);
    f.innerHTML='<button id="bk">Back</button><button class="primary" style="flex:1" id="ins">Insert Component</button>';
    $("bk").onclick=function(){ S.view="els"; render(); };
    $("ins").onclick=function(){
      post({ type:"insert-icon", job:{ groupKey:g.key, key:o.lib.key, nodeIds:[g.el.id] } });
      $("ins").textContent="…"; };
    return;
  }

  var ids=o.ids, cur=S.picked[g.key]||ids[0], isIcon=o.icon;
  if(!ids.length){
    b.innerHTML='<p class="lede">No motion fits this element at this stage.</p>';
    f.innerHTML='<button style="flex:1" id="bk">Back</button>';
    $("bk").onclick=function(){ S.view="els"; render(); }; return;
  }

  b.innerHTML=
    (isMain
      ? '<div class="flag main"><b>This Is The Main Motion</b>It is the one thing that stands out '
        +'on this frame, so it can take the strongest option.</div>'
      : main
        ? '<p class="note" style="margin-bottom:10px">'
          +esc(gs.filter(function(x){return x.key===main;})[0].label)
          +' is the main motion on this frame, so these options all stay supporting.</p>'
        : '')
    +'<p class="lede">'+ids.length+' option'+(ids.length>1?'s':'')+' that fit '
    +esc(st.label).toLowerCase()+'. All of them are valid here.</p>'
    +(isIcon?'<p class="note" style="margin:-6px 0 12px">'+esc(ICON_RULE)+'</p>':'')
    +ids.map(function(id,i){
      var p=E.motionOf(id), on=cur===id;
      return '<div class="opt'+(on?' on':'')+'" data-o="'+id+'">'
        +'<div class="opt-h"><span class="nm">'+esc(p.name)+'</span>'
        +(i===0?'<span class="pill">Suggested</span>':'')+'</div>'
        +'<div class="opt-s">'+esc(p.plain)+'</div>'
        +'<div class="pv" id="pv-'+id+'">'+pvDom(id,g)+'</div>'
        +(on?'<div class="opt-b">'
          + volBar(p,o.target,st.label)
          + '<div class="sec" style="margin-top:12px">The Four Dials</div>'
          + Object.keys(p.dials).map(function(k){
              return '<div class="kv"><span style="color:var(--ink-3)">'+esc(k)+'</span>'
                +'<span style="text-align:right">'+esc(p.dials[k])+'</span></div>'; }).join("")
          + '<div class="sec">Tokens</div>'
          + p.tokens.map(function(t){
              return '<div class="kv"><code>'+esc(t)+'</code><span>'+tokVal(t)+'</span></div>'; }).join("")
          + (p.qi?'<p class="note" style="margin-top:7px">Matches the Qi <code>'+esc(p.qi)
              +'</code> transition.</p>':'')
          + '<div class="sec">Motion Principles</div>'
          + (isIcon?'<p class="note" style="margin:-2px 0 8px">Natural carries the most weight for an icon.</p>':'')
          + TESTS.map(function(t){
              var val=(p.tests||{})[t.k];
              return '<p style="font-size:10px;line-height:1.55;margin-bottom:6px;color:'
                +(val?'var(--ink-2)':'var(--ink-3)')+'"><b style="color:var(--ink)">'+t.l+'</b> '
                +'<span style="color:var(--ink-3)">'+t.p+'</span><br>'+esc(val||t.n)+'</p>'; }).join("")
          + '<textarea readonly id="ta">'+esc(E.promptFor(id,g,S.frame.name,isMain))+'</textarea>'
          + '<button style="width:100%;margin-top:7px" id="cp">Copy Prompt</button></div>':'')
        +'</div>'; }).join("");

  ids.forEach(function(id){ playPv(id,g); });
  Array.prototype.forEach.call(b.querySelectorAll("[data-o]"),function(x){
    x.onclick=function(){ S.picked[g.key]=x.dataset.o; render(); };});
  if($("cp")) $("cp").onclick=function(ev){ ev.stopPropagation();
    navigator.clipboard.writeText($("ta").value).then(function(){
      $("cp").textContent="Copied"; setTimeout(function(){ $("cp").textContent="Copy Prompt"; },1200);
    }).catch(function(){}); };

  f.innerHTML='<button id="bk">Back</button><button class="primary" style="flex:1" id="ok">Apply '
    +esc(E.motionOf(cur).name)+'</button>';
  $("bk").onclick=function(){ S.view="els"; render(); };
  $("ok").onclick=function(){ S.picked[g.key]=cur; applyGroup(g,cur,isMain);
    $("ok").textContent="…"; setTimeout(function(){ S.view="els"; render(); },500); };
};

/* --------------------------------------------------------------- preview */
function pvDom(id,g){
  if(VERBS[id]) return '<span class="iconpv" id="ip-'+id+'">'+(g.el.svg||"")+'</span>';
  var p=PAT[id], n=(p.kind==="list"||p.kind==="leaving")?4:1, out="";
  for(var i=0;i<n;i++) out+='<div class="'+(n>1?"bar":"sq")+'"></div>';
  return out;
}
function drawIcon(wrapId){
  var w=$(wrapId); if(!w) return;
  var svg=w.querySelector("svg"); if(!svg) return;
  [].slice.call(svg.querySelectorAll("path")).forEach(function(el,i){
    var len=el.getTotalLength?el.getTotalLength():120;
    el.style.transition="none"; el.style.strokeDasharray=len; el.style.strokeDashoffset=len;
    void el.getBoundingClientRect();
    setTimeout(function(){ el.style.transition="stroke-dashoffset 300ms cubic-bezier(0,0,.58,1)";
      el.style.strokeDashoffset=0; }, i*120+80);
  });
  setTimeout(function(){ drawIcon(wrapId); },2600);
}
function playPv(id,g){
  if(VERBS[id]) return playVerb(id);
  var box=$("pv-"+id); if(!box) return;
  var p=PAT[id], d=Math.min(p.ms,900), c=EAS[p.e].c, gap=p.st||0;
  Array.prototype.forEach.call(box.children,function(el,k){
    el.style.transition="none";
    if(id==="settle"){ el.style.transform="scale(.92)"; el.style.opacity="1"; }
    else if(id==="quiet-fade"||id==="surface-fade"||id==="progressive-reveal"){ el.style.transform="none"; el.style.opacity="0"; }
    else if(id==="sheet-rise"){ el.style.transform="translateY(40px)"; el.style.opacity="1"; }
    else if(id==="single-rise"){ el.style.transform="translateY(16px)"; el.style.opacity="0"; }
    else if(id==="tap-response"){ el.style.transform="scale(.97)"; el.style.opacity="1"; }
    else if(id==="ambient-loop"){ el.style.transform="none"; el.style.opacity=".3"; }
    else if(id==="dim"||id==="recede"){ el.style.transform="none"; el.style.opacity="1"; }
    else { el.style.transform="translateY(12px)"; el.style.opacity="0"; }
    void el.offsetWidth;
    setTimeout(function(){
      el.style.transition="transform "+d+"ms "+c+", opacity "+d+"ms "+c;
      if(id==="recede"){ el.style.transform="translateY(8px)"; el.style.opacity=".4"; }
      else if(id==="dim"){ el.style.opacity=".4"; }
      else if(id==="settle"){ el.style.transform="scale(1.04)";
        setTimeout(function(){ el.style.transform="none"; }, d*0.55); }
      else { el.style.transform="none"; el.style.opacity="1"; }
    }, k*(gap||30)+80);
  });
  setTimeout(function(){ playPv(id,g); },2800);
}
function playVerb(id){
  var wrap=$("ip-"+id); if(!wrap) return;
  var vb=VERBS[id], svg=wrap.querySelector("svg"); if(!svg) return;
  var d=Math.min(vb.ms,900), c=EAS[vb.e].c;
  var paths=[].slice.call(svg.querySelectorAll("path,circle,rect,line,polyline"));
  svg.style.transition="none"; svg.style.transform="none"; svg.style.opacity="1"; svg.style.clipPath="none";
  paths.forEach(function(el){ el.style.transition="none"; el.style.strokeDasharray=""; el.style.strokeDashoffset=""; });

  if(id==="draw"){
    paths.forEach(function(el,i){
      var len=el.getTotalLength?el.getTotalLength():120;
      el.style.strokeDasharray=len; el.style.strokeDashoffset=len;
      void el.getBoundingClientRect();
      setTimeout(function(){ el.style.transition="stroke-dashoffset "+d+"ms "+c;
        el.style.strokeDashoffset=0; }, i*90+80); });
  } else if(id==="reveal"){
    svg.style.clipPath="inset(0 100% 0 0)"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="clip-path "+d+"ms "+c; svg.style.clipPath="inset(0 0 0 0)"; },80);
  } else if(id==="rotate"){
    svg.style.transform="rotate(-30deg)"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="transform "+d+"ms "+c; svg.style.transform="rotate(0deg)"; },80);
  } else if(id==="pop"){
    svg.style.transform="scale(.82)"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="transform "+d+"ms "+c; svg.style.transform="scale(1)"; },80);
  } else if(id==="drift"){
    svg.style.transform="translateY(8px)"; svg.style.opacity="0"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="transform "+d+"ms "+c+", opacity "+d+"ms "+c;
      svg.style.transform="none"; svg.style.opacity="1"; },80);
  } else if(id==="swap"){
    svg.style.opacity="1"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="opacity "+d+"ms "+c; svg.style.opacity=".25";
      setTimeout(function(){ svg.style.opacity="1"; }, d); },80);
  } else if(id==="pulse"){
    svg.style.transform="scale(1)"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="transform 1100ms linear"; svg.style.transform="scale(1.06)";
      setTimeout(function(){ svg.style.transform="scale(1)"; },1100); },80);
  } else if(id==="sheen"){
    svg.style.opacity=".3"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="opacity 1100ms linear"; svg.style.opacity="1";
      setTimeout(function(){ svg.style.opacity=".3"; },1100); },80);
  } else {
    svg.style.opacity="0"; void svg.getBoundingClientRect();
    setTimeout(function(){ svg.style.transition="opacity "+d+"ms "+c; svg.style.opacity="1"; },80);
  }
  setTimeout(function(){ playVerb(id); },2800);
}

/* -------------------------------------------------------------- settings */
function maskKey(k){ return k ? k.slice(0,7)+"..."+k.slice(-4) : ""; }

V.settings = function(b,f){
  $("ttl").textContent="Settings"; $("stp").textContent="";
  var has=!!S.apiKey;
  b.innerHTML=
    '<h3>Claude API Key</h3>'
    +'<p class="lede">Optional. With a key, Claude is asked to read a frame when the rules are '
    +'unsure, and to suggest icon motion. Without one, everything still works from the rules.</p>'
    +(has ? '<div class="flag lib"><b>Key Saved</b><code>'+esc(maskKey(S.apiKey))+'</code></div>'
          : '<div class="flag neutral"><b>No Key Saved</b>Running on rules only.</div>')
    +'<p class="q" style="margin-top:12px">'+(has?'Replace key':'Paste your key')+'</p>'
    +'<input id="kf" type="password" placeholder="sk-ant-..." value="'+esc(S.keyDraft)+'" '
    +'class="keyfield" autocomplete="off">'
    +'<div style="display:flex;gap:5px;margin-top:6px">'
    +'<button id="sv" style="flex:1"'+(S.keyDraft?'':' disabled')+'>Save and test</button>'
    +(has?'<button id="rm">Remove</button>':'')+'</div>'
    +(S.testing?'<p class="note" style="margin-top:8px"><span class="spin"></span> Testing the key…</p>':'')
    +(S.keyStatus&&!S.testing
      ? '<div class="flag '+(S.keyStatus.ok?'lib':'warn')+'" style="margin-top:8px">'
        +esc(S.keyStatus.msg)+'</div>':'')
    +'<div class="sec">Where To Get One</div>'
    +'<ol class="steps"><li>Sign in at platform.claude.com</li>'
    +'<li>Open API keys from the menu under your organisation name</li>'
    +'<li>Create key, then copy it. It is only shown once.</li></ol>'
    +'<p class="note" style="margin-top:8px">Separate from a Claude.ai subscription. New accounts get '
    +'free credits, enough for a few thousand reads. Uses '+esc(window.CLAUDE.model)+', the cheapest tier.</p>'
    +'<div class="sec">What Is Sent</div>'
    +'<p class="note">Stage names, layer names and sizes, and for icons the exported outline. '
    +'Never text content, images, or anything outside the selected frame. The key is stored on this '
    +'machine only and is never written into the plugin files.</p>';

  var kf=$("kf");
  kf.oninput=function(){ S.keyDraft=kf.value; S.keyStatus=null; render(); };
  if($("sv")) $("sv").onclick=function(){
    S.testing=true; render();
    var k=S.keyDraft.trim();
    window.CLAUDE.testKey(k).then(function(r){
      S.keyStatus=r; S.testing=false;
      if(r.ok){ S.apiKey=k; S.keyDraft=""; post({ type:"save-key", key:k }); }
      render(); }); };
  if($("rm")) $("rm").onclick=function(){
    S.apiKey=""; S.keyStatus=null; post({ type:"save-key", key:"" }); render(); };

  f.innerHTML='<button style="flex:1" id="bk">Done</button>';
  $("bk").onclick=function(){ S.view=S.prevView||"empty"; render(); };
};

render();
post({ type:"ready" });

})();
