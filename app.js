let candles=[], price=1.10000, timer=null, deferredPrompt=null;
let stats=JSON.parse(localStorage.getItem("qsb_stats")||'{"total":0,"wins":0,"losses":0,"streak":0}');
let history=JSON.parse(localStorage.getItem("qsb_history")||"[]");

const $=id=>document.getElementById(id);

function randn(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function candle(){let open=price, close=Math.max(.00001,open+(Math.random()-.49)*.0007+randn()*.00025);let high=Math.max(open,close)+Math.random()*.00018,low=Math.min(open,close)-Math.random()*.00018;price=close;return{open,high,low,close,time:Date.now()}}
function seed(){while(candles.length<120)candles.push(candle())}
function sma(a,n){return a.length<n?null:a.slice(-n).reduce((x,y)=>x+y,0)/n}
function ema(a,n){if(a.length<n)return null;let k=2/(n+1),e=a.slice(0,n).reduce((x,y)=>x+y,0)/n;for(let i=n;i<a.length;i++)e=a[i]*k+e*(1-k);return e}
function rsi(a,n=14){if(a.length<n+1)return null;let g=0,l=0;for(let i=a.length-n;i<a.length;i++){let d=a[i]-a[i-1];if(d>=0)g+=d;else l-=d}if(!l)return 100;let rs=(g/n)/(l/n);return 100-100/(1+rs)}
function macd(a){let e12=ema(a,12),e26=ema(a,26);return e12==null||e26==null?null:e12-e26}

function analyze(){
  candles.push(candle()); if(candles.length>300)candles.shift();
  let c=candles.map(x=>x.close), f=sma(c,9), s=sma(c,21), r=rsi(c), m=macd(c), call=0,put=0,why=[];
  if(f&&s){if(f>s){call+=25;why.push("9/21 bullish trend")}else{put+=25;why.push("9/21 bearish trend")}}
  if(r!=null){if(r>=52&&r<=68){call+=20;why.push("RSI bullish")}else if(r<=48&&r>=32){put+=20;why.push("RSI bearish")}}
  if(m!=null){if(m>0){call+=20;why.push("MACD positive")}else{put+=20;why.push("MACD negative")}}
  let body=candles.at(-1).close-candles.at(-1).open;if(body>0)call+=10;else if(body<0)put+=10;
  let best=Math.max(call,put),second=Math.min(call,put),conf=Math.min(99,50+Math.round(best*.45)+Math.round((best-second)*.25));
  let threshold=+$("threshold").value, direction="WAIT";
  if(conf>=threshold&&best>=45&&best-second>=15)direction=call>put?"CALL":"PUT";
  return{direction,conf,price:c.at(-1),rsi:r,macd:m,trend:f&&s?(f>s?"BULLISH":"BEARISH"):"UNKNOWN",why:why.join("; ")};
}

function render(s){
 $("direction").textContent=s.direction;$("direction").className=s.direction==="CALL"?"call":s.direction==="PUT"?"put":"wait";
 $("confidence").textContent=`Confidence ${s.conf}%`;$("reason").textContent=s.why||"No strong setup.";
 $("price").textContent=s.price?.toFixed(5)||"--";$("rsi").textContent=s.rsi?.toFixed(1)||"--";
 $("macd").textContent=s.macd?.toFixed(6)||"--";$("trend").textContent=s.trend||"--";
}
function save(){localStorage.setItem("qsb_stats",JSON.stringify(stats));localStorage.setItem("qsb_history",JSON.stringify(history))}
function drawStats(){
 $("total").textContent=stats.total;$("wins").textContent=stats.wins;$("losses").textContent=stats.losses;
 $("winrate").textContent=stats.total?Math.round(stats.wins/stats.total*100)+"%":"--";
 $("history").innerHTML=history.slice(0,20).map(x=>`<div class="item"><span>${x.time} • ${x.direction} • ${x.conf}%</span><b class="${x.result==="WIN"?"win":"loss"}">${x.result}</b></div>`).join("");
}
function recordSignal(s){
 if(s.direction==="WAIT")return;
 // Simulation: the next generated candle is used as an illustrative outcome.
 setTimeout(()=>{
   let next=candle(), win=s.direction==="CALL"?next.close>price:next.close<price;
   stats.total++;if(win){stats.wins++;stats.streak=0}else{stats.losses++;stats.streak++}
   history.unshift({time:new Date().toLocaleTimeString(),direction:s.direction,conf:s.conf,result:win?"WIN":"LOSS"});
   history=history.slice(0,50);save();drawStats();
 },900);
}
function tick(){let s=analyze();render(s);if(s.direction!=="WAIT")recordSignal(s)}

$("threshold").oninput=()=>$("thresholdVal").textContent=$("threshold").value+"%";
$("start").onclick=()=>{if(timer)return;tick();timer=setInterval(tick,6000)}
$("stop").onclick=()=>{clearInterval(timer);timer=null;$("direction").textContent="WAIT";$("direction").className="wait";$("reason").textContent="Analysis stopped."}
$("reset").onclick=()=>{stats={total:0,wins:0,losses:0,streak:0};history=[];save();drawStats()}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt=null;$("installBtn").hidden=true}

seed();drawStats();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
