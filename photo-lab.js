(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s),root=$('#photoLab');if(!root)return;
const words={
ar:{upload:'اختر صورة من جهازك',hint:'ارفع صورة JPG أو PNG أو WebP. تتم المعالجة محلياً داخل متصفحك ولا تُرسل الصورة إلى خادم.',empty:'مساحة العمل جاهزة',original:'الأصلية',edited:'المعدّلة',reset:'إعادة ضبط',download:'حفظ الصورة',replace:'اختيار صورة أخرى',filters:'التوقيع اللوني',controls:'ضبط الصورة',dna:'بصمة الصورة',brightness:'الإضاءة',contrast:'التباين',saturation:'التشبع',warmth:'دفء اللون',light:'متوسط الإضاءة',contrastStat:'تباين الإضاءة',warm:'دافئة',cool:'باردة',balanced:'متوازنة',natural:'طبيعي',cinemaWarm:'سينمائي دافئ',cinemaCool:'سينمائي بارد',mono:'أبيض وأسود',soft:'ناعم',golden:'ذهبي',badType:'اختر صورة JPG أو PNG أو WebP.',tooLarge:'حجم الصورة كبير. الحد الأقصى 20 ميغابايت.',failed:'تعذر فتح الصورة. جرّب ملفاً آخر.',note:'تحليل حسابي للألوان والإضاءة، وليس فهماً لمحتوى الصورة. الصورة لا تغادر جهازك.'},
tr:{upload:'Cihazından fotoğraf seç',hint:'JPG, PNG veya WebP yükle. İşlem tarayıcında yerel olarak yapılır; fotoğraf sunucuya gönderilmez.',empty:'Çalışma alanı hazır',original:'Orijinal',edited:'Düzenlenmiş',reset:'Sıfırla',download:'Fotoğrafı kaydet',replace:'Başka fotoğraf seç',filters:'Renk imzası',controls:'Görüntü ayarı',dna:'Fotoğraf DNA’sı',brightness:'Parlaklık',contrast:'Kontrast',saturation:'Doygunluk',warmth:'Renk sıcaklığı',light:'Ortalama ışık',contrastStat:'Işık kontrastı',warm:'Sıcak',cool:'Soğuk',balanced:'Dengeli',natural:'Doğal',cinemaWarm:'Sıcak sinematik',cinemaCool:'Soğuk sinematik',mono:'Siyah-beyaz',soft:'Yumuşak',golden:'Altın saat',badType:'JPG, PNG veya WebP seç.',tooLarge:'Dosya çok büyük. En fazla 20 MB.',failed:'Fotoğraf açılamadı. Başka bir dosya dene.',note:'Renk ve ışık için sayısal analizdir; fotoğrafın içeriğini yorumlamaz. Görsel cihazından çıkmaz.'}
};
let lang=document.documentElement.lang==='tr'?'tr':'ar',img=null,base=null,result=null,state={filter:'natural',brightness:0,contrast:0,saturation:0,warmth:0};
const file=$('#labFile',root),empty=$('.lab-placeholder',root),compare=$('.lab-compare',root),range=$('#labCompareRange',root),dna=$('#labDna',root),stats=$('#labStats',root),error=$('#labError',root),save=$('#labDownload',root),reset=$('#labReset',root);
let originalCanvas=$('#labOriginal',root),outputCanvas=$('#labOutput',root);
const t=()=>words[lang];
function translate(){lang=document.documentElement.lang==='tr'?'tr':'ar';root.querySelectorAll('[data-lab]').forEach(e=>{let k=e.dataset.lab;if(t()[k])e.textContent=t()[k];});if(!img) $('.lab-empty-copy',root).textContent=t().empty;if(img)analyze();}
new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
function fail(k){error.textContent=t()[k];error.hidden=false;}
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function setTools(on){root.querySelectorAll('[data-requires-image], [data-lab-filter]').forEach(e=>e.disabled=!on);}
function load(f){
 error.hidden=true;if(!f)return;
 if(!['image/jpeg','image/png','image/webp'].includes(f.type)){fail('badType');return;}
 if(f.size>20*1024*1024){fail('tooLarge');return;}
 let url=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{URL.revokeObjectURL(url);img=im;let scale=Math.min(1,1800/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.round(im.naturalWidth*scale),h=Math.round(im.naturalHeight*scale);
 base=canvas(w,h);base.getContext('2d',{willReadFrequently:true}).drawImage(im,0,0,w,h);result=canvas(w,h);
 let oldA=$('#labOriginal',root),oldB=$('#labOutput',root);originalCanvas=canvas(w,h);originalCanvas.id='labOriginal';originalCanvas.className='lab-original';originalCanvas.getContext('2d').drawImage(base,0,0);outputCanvas=canvas(w,h);outputCanvas.id='labOutput';oldA.replaceWith(originalCanvas);oldB.replaceWith(outputCanvas);
 compare.style.display='block';empty.hidden=true;range.disabled=false;setTools(true);state={filter:'natural',brightness:0,contrast:0,saturation:0,warmth:0};
 root.querySelectorAll('[data-lab-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labFilter==='natural')));
 root.querySelectorAll('[data-lab-control]').forEach(e=>{e.value=0;let o=$('[data-output="'+e.dataset.labControl+'"]',root);if(o)o.textContent='0';});
 range.value=50;render();analyze();
 };im.onerror=()=>{URL.revokeObjectURL(url);fail('failed');};im.src=url;
}
const presets={natural:[0,0,0,0],cinemaWarm:[-2,17,-9,13],cinemaCool:[1,15,-12,-15],mono:[0,12,-100,0],soft:[4,-13,-8,4],golden:[5,10,13,22]};
function values(){let p=presets[state.filter];return [p[0]+state.brightness,p[1]+state.contrast,p[2]+state.saturation,p[3]+state.warmth];}
function render(){if(!base||!outputCanvas)return;let d=base.getContext('2d',{willReadFrequently:true}).getImageData(0,0,base.width,base.height),a=d.data,v=values(),factor=259*(v[1]+255)/(255*(259-v[1])),sat=1+v[2]/100;
for(let i=0;i<a.length;i+=4){let r=a[i],g=a[i+1],b=a[i+2],br=v[0]*2.25,wa=v[3];r=(r-128)*factor+128+br+wa*.62;g=(g-128)*factor+128+br+wa*.08;b=(b-128)*factor+128+br-wa*.62;let gray=.299*r+.587*g+.114*b;a[i]=clamp(gray+(r-gray)*sat);a[i+1]=clamp(gray+(g-gray)*sat);a[i+2]=clamp(gray+(b-gray)*sat);}
outputCanvas.getContext('2d').putImageData(d,0,0);compareLine();}
function clamp(n){return Math.max(0,Math.min(255,Math.round(n)));}
function compareLine(){let p=Number(range.value),clip=lang==='ar'?'inset(0 '+(100-p)+'% 0 0)':'inset(0 0 0 '+(100-p)+'%)';originalCanvas.style.clipPath=clip;$('.lab-divider',root).style.left=p+'%';}
function analyze(){if(!base)return;let w=base.width,h=base.height,d=base.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,step=Math.max(1,Math.floor(Math.sqrt(w*h/10000))),r=0,g=0,b=0,l=0,l2=0,n=0,bins=new Map();
for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){let i=(y*w+x)*4,R=d[i],G=d[i+1],B=d[i+2],L=.2126*R+.7152*G+.0722*B;r+=R;g+=G;b+=B;l+=L;l2+=L*L;n++;let key=[R,G,B].map(q=>Math.min(255,Math.round(q/32)*32)).join(',');bins.set(key,(bins.get(key)||0)+1);}
dna.replaceChildren();[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).forEach(([key])=>{let el=document.createElement('div');el.className='lab-swatch';el.style.background='rgb('+key+')';let s=document.createElement('span');s.textContent=key.split(',').map(q=>Number(q).toString(16).padStart(2,'0')).join('').toUpperCase();el.append(s);dna.append(el);});
let mean=l/n,sd=Math.sqrt(Math.max(0,l2/n-mean*mean)),tone=r/n-b/n>13?t().warm:r/n-b/n< -13?t().cool:t().balanced;stats.replaceChildren();[[t().light,Math.round(mean/255*100)+'%'],[t().contrastStat,Math.round(sd/128*100)+'%'],[t().warm,tone],['RGB',Math.round(r/n)+', '+Math.round(g/n)+', '+Math.round(b/n)]].forEach(([k,v])=>{let el=document.createElement('div');el.className='lab-stat';let s=document.createElement('small'),b=document.createElement('strong');s.textContent=k;b.textContent=v;el.append(s,b);stats.append(el);});}
file.addEventListener('change',e=>{load(e.target.files[0]);file.value='';});
root.querySelectorAll('[data-lab-filter]').forEach(btn=>btn.addEventListener('click',()=>{if(!img)return;state.filter=btn.dataset.labFilter;root.querySelectorAll('[data-lab-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));['brightness','contrast','saturation','warmth'].forEach((k,i)=>{let e=$('[data-lab-control="'+k+'"]',root),o=$('[data-output="'+k+'"]',root);e.value=0;state[k]=0;o.textContent=String(presets[state.filter][i]);});render();}));
root.querySelectorAll('[data-lab-control]').forEach(e=>e.addEventListener('input',()=>{if(!img)return;let k=e.dataset.labControl,i=['brightness','contrast','saturation','warmth'].indexOf(k),v=Number(e.value);state[k]=v;const o=$('[data-output="'+k+'"]',root);o.textContent=String(v+presets[state.filter][i]);render();}));
range.addEventListener('input',compareLine);
reset.addEventListener('click',()=>{if(!img)return;state={filter:'natural',brightness:0,contrast:0,saturation:0,warmth:0};root.querySelectorAll('[data-lab-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.labFilter==='natural')));root.querySelectorAll('[data-lab-control]').forEach(e=>{e.value=0;$('[data-output="'+e.dataset.labControl+'"]',root).textContent='0';});range.value=50;render();});
save.addEventListener('click',()=>{if(!img)return;outputCanvas.toBlob(blob=>{if(!blob){fail('failed');return;}let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='hamdi-photo-lab.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);},'image/jpeg',.94);});
$('#labReplace',root).addEventListener('click',()=>file.click());setTools(false);translate();
})();