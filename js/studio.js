'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const fileInput=$('#photo'), canvas=$('#canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
  const statusEl=$('#status'), installButton=$('#installApp');
  let original=null, originalDataURL=null, rotation=0, flipped=false, flippedV=false, showOriginal=false, installPrompt=null;
  const history=[];let historyIndex=-1;
  let textLayers=[],paintStrokes=[],maskStrokes=[],cropRatio='free',activeStroke=null,activeMaskStroke=null,selectedLayerId=null;let layerSequence=0,cropSelecting=false,cropStart=null,cropRect=null;
  function snapshot(){if(!original)return;history.splice(historyIndex+1);history.push({rotation,flipped,flippedV,filter:$('#filter').value,values:{...values},textLayers:JSON.parse(JSON.stringify(textLayers)),paintStrokes:JSON.parse(JSON.stringify(paintStrokes)),maskStrokes:JSON.parse(JSON.stringify(maskStrokes)),maskAmount:$('#maskAmount').value,maskEffect:$('#maskEffect').value,maskFeather:$('#maskFeather').value,cropRatio,cropRect:cropRect?{...cropRect}:null});if(history.length>40)history.shift();historyIndex=history.length-1;updateHistoryButtons();}
  function updateHistoryButtons(){$('#undo').disabled=historyIndex<=0;$('#redo').disabled=historyIndex>=history.length-1;}
  function restore(s){rotation=s.rotation;flipped=s.flipped;flippedV=s.flippedV;textLayers=JSON.parse(JSON.stringify(s.textLayers||[]));paintStrokes=JSON.parse(JSON.stringify(s.paintStrokes||[]));maskStrokes=JSON.parse(JSON.stringify(s.maskStrokes||[]));$('#maskAmount').value=s.maskAmount??35;$('#maskAmountValue').textContent=$('#maskAmount').value;$('#maskEffect').value=s.maskEffect||'exposure';$('#maskFeather').value=s.maskFeather??12;cropRatio=s.cropRatio||'free';cropRect=s.cropRect?{...s.cropRect}:null;$('#cropRatio').value=cropRatio;$('#filter').value=s.filter;renderLayers();defs.forEach(([id])=>{values[id]=s.values[id];$('#'+id).value=values[id];$('#v-'+id).textContent=values[id];});render();updateHistoryButtons();}
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
  function renderLayers(){const root=$('#layerList');if(!root)return;root.replaceChildren();if(!textLayers.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='لا توجد طبقات نص بعد';root.append(empty);return;}textLayers.forEach((layer,index)=>{const row=document.createElement('div');row.className='layer-item'+(layer.id===selectedLayerId?' selected':'');const label=document.createElement('button');label.type='button';label.className='layer-name';label.textContent=(layer.visible===false?'◌ ':'● ')+'T · '+layer.text;label.addEventListener('click',()=>selectLayer(layer.id));const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='رفع الطبقة';up.disabled=index===textLayers.length-1;up.addEventListener('click',()=>moveLayer(index,1));const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='خفض الطبقة';down.disabled=index===0;down.addEventListener('click',()=>moveLayer(index,-1));const toggle=document.createElement('button');toggle.type='button';toggle.textContent=layer.visible===false?'إظهار':'إخفاء';toggle.addEventListener('click',()=>{layer.visible=layer.visible===false;renderLayers();render();snapshot();});const del=document.createElement('button');del.type='button';del.textContent='حذف';del.addEventListener('click',()=>{textLayers.splice(index,1);if(selectedLayerId===layer.id)selectedLayerId=null;renderLayers();render();snapshot();});row.append(label,up,down,toggle,del);root.append(row);});}
  function selectLayer(id){selectedLayerId=id;const layer=textLayers.find(x=>x.id===id);if(!layer)return;$('#selectedText').value=layer.text;$('#textOpacity').value=Math.round((layer.opacity??1)*100);$('#textPosition').value=Math.round((layer.y??.82)*100);$('#layerColor').value=layer.color;$('#layerSize').value=layer.size;renderLayers();}
  function moveLayer(index,delta){const target=index+delta;if(target<0||target>=textLayers.length)return;[textLayers[index],textLayers[target]]=[textLayers[target],textLayers[index]];renderLayers();render();snapshot();}
  function drawPaintStrokes(){if(!paintStrokes.length)return;const overlay=document.createElement('canvas');overlay.width=canvas.width;overlay.height=canvas.height;const paint=overlay.getContext('2d');paintStrokes.forEach(stroke=>{if(!stroke.points.length)return;paint.beginPath();paint.lineCap='round';paint.lineJoin='round';paint.lineWidth=stroke.size;paint.globalCompositeOperation=stroke.mode==='erase'?'destination-out':'source-over';paint.strokeStyle=stroke.color;paint.moveTo(stroke.points[0].x*overlay.width,stroke.points[0].y*overlay.height);stroke.points.slice(1).forEach(p=>paint.lineTo(p.x*overlay.width,p.y*overlay.height));if(stroke.points.length===1)paint.lineTo(stroke.points[0].x*overlay.width+.1,stroke.points[0].y*overlay.height+.1);paint.stroke();});ctx.save();ctx.globalCompositeOperation='source-over';ctx.drawImage(overlay,0,0);ctx.restore();}
  function drawTextLayers(){if(!textLayers.length)return;ctx.save();textLayers.forEach(layer=>{if(layer.visible===false)return;ctx.globalAlpha=layer.opacity??1;ctx.font='700 '+layer.size+'px Cairo, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';ctx.shadowColor='#000';ctx.shadowBlur=Math.max(2,layer.size*.12);ctx.lineWidth=Math.max(1,layer.size*.035);ctx.strokeStyle='#0009';ctx.fillStyle=layer.color;ctx.strokeText(layer.text,canvas.width/2,canvas.height*(layer.y||.82));ctx.fillText(layer.text,canvas.width/2,canvas.height*(layer.y||.82));});ctx.restore();}
  function applyToneAdjustments(){const w=canvas.width,h=canvas.height;if(w*h>6000000)return;const image=ctx.getImageData(0,0,w,h),d=image.data,hi=values.highlights/100,sh=values.shadows/100,curve=values.toneCurve/100;for(let i=0;i<d.length;i+=4){for(let k=0;k<3;k++){let v=d[i+k]/255;const shadowWeight=Math.pow(1-v,2),highlightWeight=Math.pow(v,2);v+=sh*shadowWeight*.42+hi*highlightWeight*.42;v=Math.max(0,Math.min(1,v));if(curve!==0){const gamma=Math.max(.45,Math.min(2.2,1-curve*.65));v=Math.pow(v,gamma);}d[i+k]=v*255;}}ctx.putImageData(image,0,0);}
  function applyLocalMask(){if(!maskStrokes.length||showOriginal)return;const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const m=mask.getContext('2d');m.lineCap='round';m.lineJoin='round';maskStrokes.forEach(st=>{if(!st.points.length)return;m.globalCompositeOperation=st.mode==='erase'?'destination-out':'source-over';m.globalAlpha=.82;m.strokeStyle='#fff';m.lineWidth=st.size;m.beginPath();m.moveTo(st.points[0].x*mask.width,st.points[0].y*mask.height);st.points.slice(1).forEach(p=>m.lineTo(p.x*mask.width,p.y*mask.height));if(st.points.length===1)m.lineTo(st.points[0].x*mask.width+.1,st.points[0].y*mask.height+.1);m.stroke();});const feather=Number($('#maskFeather').value);if(feather>0){const soft=document.createElement('canvas');soft.width=mask.width;soft.height=mask.height;const sc=soft.getContext('2d');sc.filter='blur('+Math.max(1,feather*canvas.width/Math.max(1,canvas.clientWidth))+'px)';sc.drawImage(mask,0,0);sc.filter='none';m.clearRect(0,0,mask.width,mask.height);m.drawImage(soft,0,0);}const md=m.getImageData(0,0,mask.width,mask.height).data,img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,amount=Number($('#maskAmount').value)/100,effect=$('#maskEffect').value;for(let p=0;p<md.length;p+=4){const a=md[p+3]/255;if(a<.002)continue;const r=d[p],g=d[p+1],b=d[p+2];let nr=r,ng=g,nb=b;if(effect==='exposure'){const f=Math.pow(2,amount*1.5*a);nr=r*f;ng=g*f;nb=b*f;}else if(effect==='saturation'){const l=.2126*r+.7152*g+.0722*b,f=1+amount*2*a;nr=l+(r-l)*f;ng=l+(g-l)*f;nb=l+(b-l)*f;}else if(effect==='warmth'){nr=r+amount*85*a;ng=g+amount*12*a;nb=b-amount*85*a;}else{const f=1+amount*1.5*a;nr=(r-128)*f+128;ng=(g-128)*f+128;nb=(b-128)*f+128;}d[p]=Math.max(0,Math.min(255,nr));d[p+1]=Math.max(0,Math.min(255,ng));d[p+2]=Math.max(0,Math.min(255,nb));}ctx.putImageData(img,0,0);}
  function render(){
    if(!original)return;
    const w=original.naturalWidth,h=original.naturalHeight,swap=Math.abs(rotation)%180===90;
    canvas.width=swap?h:w;canvas.height=swap?w:h;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(rotation*Math.PI/180);ctx.scale(flipped?-1:1,flippedV?-1:1);ctx.filter=showOriginal?'none':cssFilter();
    ctx.drawImage(original,-w/2,-h/2,w,h);ctx.restore();ctx.filter='none';
    if(!showOriginal){applyToneAdjustments();if(values.sharpness>0)sharpen(values.sharpness/100);}
    
    if(!showOriginal&&cropRatio!=='free'){const ratio=Number(cropRatio),w0=canvas.width,h0=canvas.height;let cw=w0,ch=h0;if(w0/h0>ratio)cw=Math.round(h0*ratio);else ch=Math.round(w0/ratio);const sx=Math.round((w0-cw)/2),sy=Math.round((h0-ch)/2),tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;tmp.getContext('2d').drawImage(canvas,sx,sy,cw,ch,0,0,cw,ch);canvas.width=cw;canvas.height=ch;ctx.drawImage(tmp,0,0);}
    if(!showOriginal){applyLocalMask();drawPaintStrokes();drawTextLayers();if(cropSelecting&&cropRect){ctx.save();ctx.strokeStyle='#f4d99e';ctx.lineWidth=Math.max(2,canvas.width/700);ctx.setLineDash([10,7]);ctx.strokeRect(cropRect.x*canvas.width,cropRect.y*canvas.height,cropRect.w*canvas.width,cropRect.h*canvas.height);ctx.fillStyle='#f4d99e22';ctx.fillRect(cropRect.x*canvas.width,cropRect.y*canvas.height,cropRect.w*canvas.width,cropRect.h*canvas.height);ctx.restore();}}
  }
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0];if(!file)return;
    const rawExt=/\.(dng|cr2|cr3|nef|nrw|arw|srf|sr2|raf|orf|rw2|pef|3fr|fff|iiq|x3f|rwl|erf|kdc|dcr|mef|mos|mrw|raw)$/i;const isRaw=rawExt.test(file.name);
    if(!isRaw&&!['image/jpeg','image/png','image/webp'].includes(file.type)){setStatus('صيغة الصورة غير مدعومة');return;}
    originalDataURL=null;const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{original=img;const dataReader=new FileReader();dataReader.onload=()=>{originalDataURL=dataReader.result;};dataReader.readAsDataURL(file);rotation=0;flipped=false;flippedV=false;resetValues();textLayers=[];paintStrokes=[];maskStrokes=[];cropRatio='free';cropRect=null;cropSelecting=false;$('#cropRatio').value='free';renderLayers();history.length=0;historyIndex=-1;$('#placeholder').textContent=file.name;$('#empty').hidden=true;render();snapshot();setStatus(isRaw?'تم تحميل معاينة الملف عبر مفكك الصور المتاح بالمتصفح. هذا لا يضمن فك بيانات RAW الأصلية أو إتاحة تحكم RAW الكامل.':'تم تحميل الصورة محليًا على جهازك.');URL.revokeObjectURL(url);};
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
    const wasShowingOriginal=showOriginal;showOriginal=false;render();const link=document.createElement('a');link.href=canvas.toDataURL(type,type==='image/jpeg'?0.94:undefined);
    link.download='hamdi-photography-edit.'+(type==='image/png'?'png':'jpg');link.click();showOriginal=wasShowingOriginal;if(showOriginal){$('#compare').textContent='العودة للتعديل';render();}setStatus('تم تجهيز النسخة المعدّلة للتنزيل');
  }
  $('#download').addEventListener('click',()=>save('image/jpeg'));
  $('#png').addEventListener('click',()=>save('image/png'));
  $('#addTextLayer').addEventListener('click',()=>{if(!original){setStatus('ارفع صورة أولاً');return;}const text=$('#layerText').value.trim();if(!text){setStatus('اكتب النص أولاً');return;}const layer={id:'text-'+(++layerSequence),text,color:$('#layerColor').value,size:Number($('#layerSize').value),y:.82,opacity:1,visible:true};textLayers.push(layer);selectedLayerId=layer.id;renderLayers();selectLayer(layer.id);render();snapshot();$('#layerText').value='';setStatus('تمت إضافة طبقة النص.');});
  $('#selectedText').addEventListener('input',()=>{const layer=textLayers.find(x=>x.id===selectedLayerId);if(!layer)return;layer.text=$('#selectedText').value;renderLayers();render();});
  $('#textOpacity').addEventListener('input',()=>{const layer=textLayers.find(x=>x.id===selectedLayerId);if(!layer)return;layer.opacity=Number($('#textOpacity').value)/100;render();});
  $('#textPosition').addEventListener('input',()=>{const layer=textLayers.find(x=>x.id===selectedLayerId);if(!layer)return;layer.y=Number($('#textPosition').value)/100;render();});
  ['selectedText','textOpacity','textPosition'].forEach(id=>$('#'+id).addEventListener('change',snapshot));
  $('#clearBrush').addEventListener('click',()=>{if(!original)return;paintStrokes=[];render();snapshot();setStatus('تم مسح طبقة الرسم.');});
  $('#toggleMask').addEventListener('click',()=>{const active=$('#maskMode').dataset.active!=='true';$('#maskMode').dataset.active=String(active);$('#toggleMask').textContent=active?'إيقاف قناع التعديل':'تفعيل قناع التعديل';setStatus(active?'وضع القناع فعال: ارسم فوق المنطقة المراد تعديلها.':'تم إيقاف وضع القناع.');});$('#maskMode').addEventListener('change',()=>{if($('#maskMode').dataset.active==='true')setStatus('ارسم لإضافة القناع أو إزالة أجزائه.');});$('#brushMode').addEventListener('change',()=>{if($('#maskMode').dataset.active==='true'){$('#maskMode').dataset.active='false';$('#toggleMask').textContent='تفعيل قناع التعديل';}});$('#maskAmount').addEventListener('input',()=>{$('#maskAmountValue').textContent=$('#maskAmount').value;render();});$('#maskAmount').addEventListener('change',snapshot);$('#maskEffect').addEventListener('change',()=>{render();snapshot();});$('#maskFeather').addEventListener('input',render);$('#maskFeather').addEventListener('change',snapshot);$('#maskSize').addEventListener('change',snapshot);$('#clearMask').addEventListener('click',()=>{maskStrokes=[];render();snapshot();setStatus('تم مسح قناع التعديل.');});
  function pointerPoint(event){const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};}
  canvas.addEventListener('pointerdown',event=>{if(!original||showOriginal)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);if(cropSelecting){cropStart=pointerPoint(event);cropRect={x:cropStart.x,y:cropStart.y,w:0,h:0};render();return;}if($('#maskMode')&&$('#maskMode').dataset.active==='true'){activeMaskStroke={size:Number($('#maskSize').value)*canvas.width/Math.max(1,canvas.clientWidth),mode:$('#maskMode').value,points:[pointerPoint(event)]};maskStrokes.push(activeMaskStroke);}else{activeStroke={color:$('#brushColor').value,size:Number($('#brushSize').value)*canvas.width/Math.max(1,canvas.clientWidth),mode:$('#brushMode').value,points:[pointerPoint(event)]};paintStrokes.push(activeStroke);}render();});
  canvas.addEventListener('pointermove',event=>{if(cropSelecting&&cropStart){const p=pointerPoint(event);cropRect={x:Math.min(cropStart.x,p.x),y:Math.min(cropStart.y,p.y),w:Math.abs(p.x-cropStart.x),h:Math.abs(p.y-cropStart.y)};render();return;}if(activeMaskStroke){activeMaskStroke.points.push(pointerPoint(event));render();return;}if(!activeStroke)return;activeStroke.points.push(pointerPoint(event));render();});
  function finishStroke(){if(cropSelecting&&cropStart){cropStart=null;if(cropRect&&(cropRect.w<.01||cropRect.h<.01))cropRect=null;render();return;}if(activeMaskStroke){activeMaskStroke=null;snapshot();return;}if(!activeStroke)return;activeStroke=null;snapshot();}
  canvas.addEventListener('pointerup',finishStroke);canvas.addEventListener('pointercancel',finishStroke);canvas.addEventListener('lostpointercapture',finishStroke);
  $('#startFreeCrop').addEventListener('click',()=>{if(!original){setStatus('ارفع صورة أولاً');return;}cropSelecting=!cropSelecting;cropStart=null;$('#startFreeCrop').textContent=cropSelecting?'إلغاء تحديد القص':'تحديد القص بالماوس';setStatus(cropSelecting?'اسحب بالماوس أو اللمس لتحديد منطقة القص.':'تم إلغاء وضع تحديد القص.');render();});
  $('#applyCrop').addEventListener('click',()=>{if(!original)return;if(cropSelecting){cropSelecting=false;cropStart=null;$('#startFreeCrop').textContent='تحديد القص بالماوس';}if(!cropRect&&cropRatio==='free'){setStatus('حدد منطقة القص أولاً أو اختر نسبة قص.');return;}if(cropRect){const r={...cropRect};if(r.w<.01||r.h<.01){setStatus('منطقة القص صغيرة جدًا.');return;}cropRect=null;render();const temp=document.createElement('canvas');temp.width=Math.max(1,Math.round(canvas.width*r.w));temp.height=Math.max(1,Math.round(canvas.height*r.h));temp.getContext('2d').drawImage(canvas,Math.round(canvas.width*r.x),Math.round(canvas.height*r.y),temp.width,temp.height,0,0,temp.width,temp.height);const flattened=temp.toDataURL('image/png');const nextImage=new Image();nextImage.onload=()=>{original=nextImage;originalDataURL=flattened;rotation=0;flipped=false;flippedV=false;resetValues();textLayers=[];paintStrokes=[];maskStrokes=[];cropRatio='free';cropRect=null;cropSelecting=false;$('#cropRatio').value='free';$('#startFreeCrop').textContent='تحديد القص بالماوس';renderLayers();history.length=0;historyIndex=-1;render();snapshot();setStatus('تم تطبيق القص ودمج التعديلات الظاهرة في الصورة. بدأ سجل التراجع من هذه النقطة.');};nextImage.onerror=()=>setStatus('تعذر إتمام القص؛ بقيت الصورة السابقة كما هي.');nextImage.src=flattened;return;}cropRatio=$('#cropRatio').value;render();snapshot();setStatus(cropRatio==='free'?'تم إلغاء القص.':'تم تطبيق القص الوسطي.');});
  $('#saveProject').addEventListener('click',()=>{if(!original){setStatus('ارفع صورة أولاً');return;}if(!originalDataURL){setStatus('انتظر اكتمال تجهيز الصورة الأصلية ثم احفظ المشروع.');return;}const project={app:'Hamdi Photography Studio',version:1,image:originalDataURL,paintStrokes,maskStrokes,maskAmount:$('#maskAmount').value,maskEffect:$('#maskEffect').value,maskFeather:$('#maskFeather').value,selectedLayerId,cropRect,rotation,flipped,flippedV,filter:$('#filter').value,values,textLayers,cropRatio};const blob=new Blob([JSON.stringify(project)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hamdi-studio-project.json';a.click();URL.revokeObjectURL(url);setStatus('تم حفظ ملف المشروع على جهازك.');});
  $('#loadProject').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const p=JSON.parse(reader.result);if(p.app!=='Hamdi Photography Studio'||typeof p.image!=='string'||!p.image.startsWith('data:image/')||p.image.length>120000000)throw new Error('invalid');if(p.textLayers!==undefined&&!Array.isArray(p.textLayers))throw new Error('invalid');if(p.paintStrokes!==undefined&&!Array.isArray(p.paintStrokes))throw new Error('invalid');if(p.maskStrokes!==undefined&&!Array.isArray(p.maskStrokes))throw new Error('invalid');if(p.cropRect!==undefined&&p.cropRect!==null&&(!['x','y','w','h'].every(k=>Number.isFinite(p.cropRect[k]))||p.cropRect.x<0||p.cropRect.y<0||p.cropRect.w<=0||p.cropRect.h<=0||p.cropRect.x+p.cropRect.w>1.001||p.cropRect.y+p.cropRect.h>1.001))throw new Error('invalid');const img=new Image();img.onload=()=>{original=img;originalDataURL=p.image;rotation=p.rotation||0;flipped=!!p.flipped;flippedV=!!p.flippedV;textLayers=(p.textLayers||[]).filter(x=>x&&typeof x.text==='string'&&typeof x.id==='string').slice(0,200);selectedLayerId=textLayers.some(x=>x.id===p.selectedLayerId)?p.selectedLayerId:null;maskStrokes=(p.maskStrokes||[]).filter(x=>x&&Array.isArray(x.points)&&x.points.length<=20000&&Number.isFinite(x.size)&&['paint','erase'].includes(x.mode)).slice(0,5000);$('#maskAmount').value=p.maskAmount??35;$('#maskAmountValue').textContent=$('#maskAmount').value;$('#maskEffect').value=['exposure','saturation','warmth','contrast'].includes(p.maskEffect)?p.maskEffect:'exposure';$('#maskFeather').value=p.maskFeather??12;paintStrokes=(p.paintStrokes||[]).filter(x=>x&&Array.isArray(x.points)&&x.points.length<=20000&&Number.isFinite(x.size)&&typeof x.mode==='string').slice(0,5000);cropRatio=p.cropRatio||'free';cropRect=p.cropRect||null;$('#cropRatio').value=cropRatio;$('#filter').value=p.filter||'none';defs.forEach(([id,,,,initial])=>{values[id]=p.values?.[id]??initial;$('#'+id).value=values[id];$('#v-'+id).textContent=values[id];});$('#empty').hidden=true;history.length=0;historyIndex=-1;renderLayers();if(selectedLayerId)selectLayer(selectedLayerId);render();snapshot();setStatus('تم فتح المشروع بنجاح.');};img.onerror=()=>setStatus('تعذر فتح صورة المشروع.');img.src=p.image;}catch(e){setStatus('ملف المشروع غير صالح أو غير مدعوم.');}};reader.readAsText(file);event.target.value='';});
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