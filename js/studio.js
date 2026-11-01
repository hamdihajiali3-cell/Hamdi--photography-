'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const fileInput=$('#photo'), canvas=$('#canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
  const statusEl=$('#status'), installButton=$('#installApp');
  let original=null, rotation=0, flipped=false, showOriginal=false, installPrompt=null;
  const defs=[['brightness','السطوع',-100,100,0,1],['contrast','التباين',-100,100,0,1],['saturation','التشبّع',-100,100,0,1],['warmth','دفء الألوان',-100,100,0,1],['exposure','التعريض',-2,2,0,.1],['sharpness','الحدة',0,100,0,1]];
  const values={};
  function setStatus(message){statusEl.textContent=message;}
  function buildControls(){
    const root=$('#controls');
    defs.forEach(([id,label,min,max,value,step])=>{
      values[id]=value;
      const box=document.createElement('div'); box.className='control';
      const title=document.createElement('label'); const name=document.createElement('span'); name.textContent=label;
      const output=document.createElement('output'); output.id='v-'+id; output.textContent=value;
      title.append(name,output);
      const input=document.createElement('input'); input.type='range'; input.id=id; input.min=min; input.max=max; input.step=step; input.value=value;
      input.addEventListener('input',()=>{values[id]=Number(input.value);output.textContent=input.value;render();});
      box.append(title,input); root.append(box);
    });
  }
  function resetValues(){
    defs.forEach(([id,,,,value])=>{values[id]=value;$('#'+id).value=value;$('#v-'+id).textContent=value;});
    $('#filter').value='none'; showOriginal=false; $('#compare').textContent='عرض الأصل';
  }
  function cssFilter(){
    let b=100+values.brightness+values.exposure*25,c=100+values.contrast,s=100+values.saturation,sepia=0,gray=0;
    switch($('#filter').value){
      case 'cinema':sepia=24;s+=12;c+=8;break;
      case 'moody':b-=12;c+=28;s-=22;break;
      case 'portrait':b+=8;c-=8;s-=8;break;
      case 'bw':gray=100;break;
      case 'vintage':sepia=48;s-=28;c-=8;break;
    }
    return 'brightness('+b+'%) contrast('+c+'%) saturate('+s+'%) sepia('+sepia+'%) grayscale('+gray+'%) hue-rotate('+(-values.warmth*.12)+'deg)';
  }
  function sharpen(amount){
    const w=canvas.width,h=canvas.height;if(w*h>2500000)return;
    const image=ctx.getImageData(0,0,w,h),data=image.data,out=new Uint8ClampedArray(data),factor=amount*.65;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4;for(let k=0;k<3;k++){const avg=(data[i-4+k]+data[i+4+k]+data[i-w*4+k]+data[i+w*4+k])/4;out[i+k]=Math.max(0,Math.min(255,data[i+k]+(data[i+k]-avg)*factor));}}
    image.data.set(out);ctx.putImageData(image,0,0);
  }
  function render(){
    if(!original)return;
    const w=original.naturalWidth,h=original.naturalHeight,swap=Math.abs(rotation)%180===90;
    canvas.width=swap?h:w;canvas.height=swap?w:h;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(rotation*Math.PI/180);ctx.scale(flipped?-1:1,1);ctx.filter=showOriginal?'none':cssFilter();
    ctx.drawImage(original,-w/2,-h/2,w,h);ctx.restore();ctx.filter='none';
    if(!showOriginal&&values.sharpness>0)sharpen(values.sharpness/100);
  }
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('صيغة الصورة غير مدعومة');return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{original=img;rotation=0;flipped=false;resetValues();$('#placeholder').textContent=file.name;$('#empty').hidden=true;render();setStatus('تم تحميل الصورة محليًا على جهازك.');URL.revokeObjectURL(url);};
    img.onerror=()=>{setStatus('تعذر فتح الصورة');URL.revokeObjectURL(url);};img.src=url;
  });
  $('#filter').addEventListener('change',render);
  $('#reset').addEventListener('click',()=>{if(!original)return;resetValues();rotation=0;flipped=false;render();setStatus('تمت إعادة الضبط');});
  $('#rotate').addEventListener('click',()=>{if(!original)return;rotation=(rotation+90)%360;render();});
  $('#flip').addEventListener('click',()=>{if(!original)return;flipped=!flipped;render();});
  $('#compare').addEventListener('click',()=>{if(!original)return;showOriginal=!showOriginal;$('#compare').textContent=showOriginal?'العودة للتعديل':'عرض الأصل';render();});
  function save(type){
    if(!original){setStatus('ارفع صورة أولاً');return;}
    render();const link=document.createElement('a');link.href=canvas.toDataURL(type,type==='image/jpeg'?0.94:undefined);
    link.download='hamdi-photography-edit.'+(type==='image/png'?'png':'jpg');link.click();setStatus('تم تجهيز الصورة للتنزيل');
  }
  $('#download').addEventListener('click',()=>save('image/jpeg'));
  $('#png').addEventListener('click',()=>save('image/png'));
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  installButton.addEventListener('click',async()=>{
    if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}
    else setStatus('على Chrome أو Edge: افتح قائمة المتصفح واختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.');
  });
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker:',error)));}
  buildControls();
})();