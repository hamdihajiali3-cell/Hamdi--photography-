'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const fileInput=$('#photo'), canvas=$('#canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
  const statusEl=$('#status'), installButton=$('#installApp');
  let original=null, originalDataURL=null, rotation=0, flipped=false, flippedV=false, showOriginal=false, installPrompt=null;
  const history=[];let historyIndex=-1;
  let textLayers=[],paintStrokes=[],cropRatio='free',activeStroke=null;
  function snapshot(){if(!original)return;history.splice(historyIndex+1);history.push({rotation,flipped,flippedV,filter:$('#filter').value,values:{...values},textLayers:JSON.parse(JSON.stringify(textLayers)),paintStrokes:JSON.parse(JSON.stringify(paintStrokes)),cropRatio});if(history.length>40)history.shift();historyIndex=history.length-1;updateHistoryButtons();}
  function updateHistoryButtons(){$('#undo').disabled=historyIndex<=0;$('#redo').disabled=historyIndex>=history.length-1;}
  function restore(s){rotation=s.rotation;flipped=s.flipped;flippedV=s.flippedV;textLayers=JSON.parse(JSON.stringify(s.textLayers||[]));paintStrokes=JSON.parse(JSON.stringify(s.paintStrokes||[]));cropRatio=s.cropRatio||'free';$('#cropRatio').value=cropRatio;$('#filter').value=s.filter;renderLayers();defs.forEach(([id])=>{values[id]=s.values[id];$('#'+id).value=values[id];$('#v-'+id).textContent=values[id];});render();updateHistoryButtons();}
  const defs=[['brightness','السطوع',-100,100,0,1],['contrast','التباين',-100,100,0,1],['saturation','التشبّع',-100,100,0,1],['warmth','دفء الألوان',-100,100,0,1],['exposure','التعريض',-2,2,0,.1],['sharpness','الحدة',0,100,0,1],['highlights','الإضاءات Highlights',-100,100,0,1],['shadows','الظلال Shadows',-100,100,0,1],['toneCurve','منحنى الدرجات Tone',-100,100,0,1]];
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
      input.addEventListener('change',snapshot);
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
  function renderLayers(){const root=$('#layerList');if(!root)return;root.replaceChildren();if(!textLayers.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='لا توجد طبقات نص بعد';root.append(empty);return;}textLayers.forEach((layer,index)=>{const row=document.createElement('div');row.className='layer-item';const label=document.createElement('span');label.textContent='T · '+layer.text;const del=document.createElement('button');del.type='button';del.textContent='حذف';del.addEventListener('click',()=>{textLayers.splice(index,1);renderLayers();render();snapshot();});row.append(label,del);root.append(row);});}
  function drawPaintStrokes(){if(!paintStrokes.length)return;ctx.save();paintStrokes.forEach(stroke=>{if(!stroke.points.length)return;ctx.beginPath();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=stroke.size;ctx.globalCompositeOperation=stroke.mode==='erase'?'destination-out':'source-over';ctx.strokeStyle=stroke.color;ctx.moveTo(stroke.points[0].x*canvas.width,stroke.points[0].y*canvas.height);stroke.points.slice(1).forEach(p=>ctx.lineTo(p.x*canvas.width,p.y*canvas.height));if(stroke.points.length===1)ctx.lineTo(stroke.points[0].x*canvas.width+.1,stroke.points[0].y*canvas.height+.1);ctx.stroke();});ctx.restore();}
  function drawTextLayers(){if(!textLayers.length)return;ctx.save();textLayers.forEach(layer=>{ctx.font='700 '+layer.size+'px Cairo, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';ctx.shadowColor='#000';ctx.shadowBlur=Math.max(2,layer.size*.12);ctx.lineWidth=Math.max(1,layer.size*.035);ctx.strokeStyle='#0009';ctx.fillStyle=layer.color;ctx.strokeText(layer.text,canvas.width/2,canvas.height*(layer.y||.82));ctx.fillText(layer.text,canvas.width/2,canvas.height*(layer.y||.82));});ctx.restore();}
  function applyToneAdjustments(){const w=canvas.width,h=canvas.height;if(w*h>6000000)return;const image=ctx.getImageData(0,0,w,h),d=image.data,hi=values.highlights/100,sh=values.shadows/100,curve=values.toneCurve/100;for(let i=0;i<d.length;i+=4){for(let k=0;k<3;k++){let v=d[i+k]/255;const shadowWeight=Math.pow(1-v,2),highlightWeight=Math.pow(v,2);v+=sh*shadowWeight*.42+hi*highlightWeight*.42;v=Math.max(0,Math.min(1,v));if(curve!==0){const gamma=Math.max(.45,Math.min(2.2,1-curve*.65));v=Math.pow(v,gamma);}d[i+k]=v*255;}}ctx.putImageData(image,0,0);}
  function render(){
    if(!original)return;
    const w=original.naturalWidth,h=original.naturalHeight,swap=Math.abs(rotation)%180===90;
    canvas.width=swap?h:w;canvas.height=swap?w:h;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(rotation*Math.PI/180);ctx.scale(flipped?-1:1,flippedV?-1:1);ctx.filter=showOriginal?'none':cssFilter();
    ctx.drawImage(original,-w/2,-h/2,w,h);ctx.restore();ctx.filter='none';
    if(!showOriginal){applyToneAdjustments();if(values.sharpness>0)sharpen(values.sharpness/100);}
    if(!showOriginal&&cropRatio!=='free'){const ratio=Number(cropRatio),w0=canvas.width,h0=canvas.height;let cw=w0,ch=h0;if(w0/h0>ratio)cw=Math.round(h0*ratio);else ch=Math.round(w0/ratio);const sx=Math.round((w0-cw)/2),sy=Math.round((h0-ch)/2),tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;tmp.getContext('2d').drawImage(canvas,sx,sy,cw,ch,0,0,cw,ch);canvas.width=cw;canvas.height=ch;ctx.drawImage(tmp,0,0);}
    if(!showOriginal){drawPaintStrokes();drawTextLayers();}
  }
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0];if(!file)return;
    const rawExt=/\.(dng|cr2|cr3|nef|nrw|arw|srf|sr2|raf|orf|rw2|pef|3fr|fff|iiq|x3f|rwl|erf|kdc|dcr|mef|mos|mrw|raw)$/i;const isRaw=rawExt.test(file.name);
    if(!isRaw&&!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('صيغة الصورة غير مدعومة');return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{original=img;const dataReader=new FileReader();dataReader.onload=()=>{originalDataURL=dataReader.result;};dataReader.readAsDataURL(file);rotation=0;flipped=false;flippedV=false;resetValues();textLayers=[];paintStrokes=[];cropRatio='free';$('#cropRatio').value='free';renderLayers();history.length=0;historyIndex=-1;$('#placeholder').textContent=file.name;$('#empty').hidden=true;render();snapshot();setStatus(isRaw?'تم فتح ملف RAW عبر مفكك الصور المتاح في المتصفح. قد تختلف معالجة الألوان عن محرك الكاميرا.':'تم تحميل الصورة محليًا على جهازك.');URL.revokeObjectURL(url);};
    img.onerror=()=>{setStatus(isRaw?'تم التعرف على ملف RAW، لكن المتصفح لا يستطيع فك هذا النوع بعد. احتفظنا بالملف الأصلي؛ نحتاج محرك RAW محليًا مدمجًا قبل تحريره.':'تعذر فتح الصورة');URL.revokeObjectURL(url);};img.src=url;
  });
  $('#filter').addEventListener('change',()=>{render();snapshot();});
  $('#reset').addEventListener('click',()=>{if(!original)return;resetValues();rotation=0;flipped=false;flippedV=false;render();snapshot();setStatus('تمت إعادة الضبط');});
  $('#rotate').addEventListener('click',()=>{if(!original)return;rotation=(rotation+90)%360;render();snapshot();});
  $('#flip').addEventListener('click',()=>{if(!original)return;flipped=!flipped;render();snapshot();});
  $('#rotateLeft').addEventListener('click',()=>{if(!original)return;rotation=(rotation+270)%360;render();snapshot();});
  $('#flipVertical').addEventListener('click',()=>{if(!original)return;flippedV=!flippedV;render();snapshot();});
  $('#undo').addEventListener('click',()=>{if(historyIndex>0){historyIndex--;restore(history[historyIndex]);setStatus('تم التراجع عن آخر تعديل');}});
  $('#redo').addEventListener('click',()=>{if(historyIndex<history.length-1){historyIndex++;restore(history[historyIndex]);setStatus('تمت إعادة التعديل');}});
  $('#compare').addEventListener('click',()=>{if(!original)return;showOriginal=!showOriginal;$('#compare').textContent=showOriginal?'العودة للتعديل':'عرض الأصل';render();});
  function save(type){
    if(!original){setStatus('ارفع صورة أولاً');return;}
    render();const link=document.createElement('a');link.href=canvas.toDataURL(type,type==='image/jpeg'?0.94:undefined);
    link.download='hamdi-photography-edit.'+(type==='image/png'?'png':'jpg');link.click();setStatus('تم تجهيز الصورة للتنزيل');
  }
  $('#download').addEventListener('click',()=>save('image/jpeg'));
  $('#png').addEventListener('click',()=>save('image/png'));
  $('#addTextLayer').addEventListener('click',()=>{if(!original){setStatus('ارفع صورة أولاً');return;}const text=$('#layerText').value.trim();if(!text){setStatus('اكتب النص أولاً');return;}textLayers.push({text,color:$('#layerColor').value,size:Number($('#layerSize').value),y:.82});renderLayers();render();snapshot();$('#layerText').value='';setStatus('تمت إضافة طبقة النص.');});
  $('#clearBrush').addEventListener('click',()=>{if(!original)return;paintStrokes=[];render();snapshot();setStatus('تم مسح طبقة الرسم.');});
  function pointerPoint(event){const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};}
  canvas.addEventListener('pointerdown',event=>{if(!original||showOriginal)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);activeStroke={color:$('#brushColor').value,size:Number($('#brushSize').value)*canvas.width/Math.max(1,canvas.clientWidth),mode:$('#brushMode').value,points:[pointerPoint(event)]};paintStrokes.push(activeStroke);render();});
  canvas.addEventListener('pointermove',event=>{if(!activeStroke)return;activeStroke.points.push(pointerPoint(event));render();});
  function finishStroke(){if(!activeStroke)return;activeStroke=null;snapshot();}
  canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);canvas.addEventListener('lostpointercapture',finishStroke);
  $('#applyCrop').addEventListener('click',()=>{if(!original)return;cropRatio=$('#cropRatio').value;render();snapshot();setStatus(cropRatio==='free'?'تم إلغاء القص.':'تم تطبيق القص الوسطي.');});
  $('#saveProject').addEventListener('click',()=>{if(!original){setStatus('ارفع صورة أولاً');return;}const project={app:'Hamdi Photography Studio',version:1,image:originalDataURL,paintStrokes,rotation,flipped,flippedV,filter:$('#filter').value,values,textLayers,cropRatio};const blob=new Blob([JSON.stringify(project)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hamdi-studio-project.json';a.click();URL.revokeObjectURL(url);setStatus('تم حفظ ملف المشروع على جهازك.');});
  $('#loadProject').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const p=JSON.parse(reader.result);if(p.app!=='Hamdi Photography Studio'||!p.image)throw new Error('invalid');const img=new Image();img.onload=()=>{original=img;originalDataURL=p.image;rotation=p.rotation||0;flipped=!!p.flipped;flippedV=!!p.flippedV;textLayers=p.textLayers||[];paintStrokes=p.paintStrokes||[];cropRatio=p.cropRatio||'free';$('#cropRatio').value=cropRatio;$('#filter').value=p.filter||'none';defs.forEach(([id,,,,initial])=>{values[id]=p.values?.[id]??initial;$('#'+id).value=values[id];$('#v-'+id).textContent=values[id];});$('#empty').hidden=true;history.length=0;historyIndex=-1;renderLayers();render();snapshot();setStatus('تم فتح المشروع بنجاح.');};img.onerror=()=>setStatus('تعذر فتح صورة المشروع.');img.src=p.image;}catch(e){setStatus('ملف المشروع غير صالح أو غير مدعوم.');}};reader.readAsText(file);event.target.value='';});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.textContent='تثبيت التطبيق';setStatus('التطبيق جاهز للتثبيت. اضغط زر تثبيت التطبيق.');});
  window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.textContent='تم تثبيت التطبيق';installButton.disabled=true;setStatus('تم تثبيت Hamdi Photography Studio بنجاح.');});
  installButton.addEventListener('click',async()=>{
    if(installPrompt){
      installPrompt.prompt();
      const choice=await installPrompt.userChoice;
      setStatus(choice&&choice.outcome==='accepted'?'تمت الموافقة على تثبيت التطبيق.':'تم إلغاء التثبيت. يمكنك المحاولة مرة أخرى لاحقًا.');
      installPrompt=null;
      return;
    }
    const ua=navigator.userAgent;
    if(/Firefox/i.test(ua)){
      setStatus('متصفح Firefox لا يعرض نافذة تثبيت PWA عبر هذا الزر. افتح رابط الاستوديو في Google Chrome أو Microsoft Edge، ثم اختر تثبيت التطبيق من قائمة المتصفح.');
    }else if(/iPhone|iPad|iPod/i.test(ua)){
      setStatus('على iPhone أو iPad: افتح زر المشاركة في Safari ثم اختر إضافة إلى الشاشة الرئيسية.');
    }else if(/Android/i.test(ua)){
      setStatus('افتح قائمة Chrome ⋮ ثم اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية. إذا لم يظهر الخيار، حدّث الصفحة بعد تحميلها بالكامل.');
    }else if(window.matchMedia('(display-mode: standalone)').matches){
      setStatus('التطبيق مثبت بالفعل على هذا الجهاز.');
    }else{
      setStatus('افتح الموقع في Google Chrome أو Microsoft Edge، ثم من قائمة المتصفح اختر تثبيت التطبيق أو Install app.');
    }
  });
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service worker:',error)));}
  buildControls();
})();