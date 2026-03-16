(function() {
        'use strict';

        const NU_TARGETS = {
            inst:  { w: 280, h: 180, label: 'Logo institucional' },
            prof:  { w: 160, h: 160, label: 'Logo profesional' },
            firma: { w: 500, h: 200, label: 'Firma digital' }
        };

        let _nuOrigImg = null;
        let _nuResultB64 = null;

        // Reutilizar funciones Canvas del procesador gift (están en scope global via window)
        function _nuLoadImg(src) {
            return new Promise((res, rej) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => res(img);
                img.onerror = () => rej(new Error('No se pudo cargar'));
                img.src = src;
            });
        }

        function _nuDetectBg(imageData) {
            const { data, width, height } = imageData;
            const sz = Math.min(10, Math.floor(Math.min(width, height) / 4));
            let rS=0,gS=0,bS=0,c=0;
            [{x:0,y:0},{x:width-sz,y:0},{x:0,y:height-sz},{x:width-sz,y:height-sz}].forEach(corner => {
                for(let dy=0;dy<sz;dy++) for(let dx=0;dx<sz;dx++) {
                    const i=((corner.y+dy)*width+(corner.x+dx))*4;
                    rS+=data[i]; gS+=data[i+1]; bS+=data[i+2]; c++;
                }
            });
            return {r:Math.round(rS/c),g:Math.round(gS/c),b:Math.round(bS/c)};
        }

        function _nuRemoveColor(imageData, bg, threshold) {
            const d=imageData.data, t2=threshold*threshold;
            for(let i=0;i<d.length;i+=4){
                const dr=d[i]-bg.r,dg=d[i+1]-bg.g,db=d[i+2]-bg.b,dist2=dr*dr+dg*dg+db*db;
                if(dist2<t2){ d[i+3]=Math.round(d[i+3]*Math.max(0,(Math.sqrt(dist2)/threshold)*0.8)); }
            }
        }

        function _nuTrim(canvas) {
            const ctx=canvas.getContext('2d'),id=ctx.getImageData(0,0,canvas.width,canvas.height);
            const d=id.data,w=id.width,h=id.height;
            let top=h,left=w,bottom=0,right=0;
            for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
                if(d[(y*w+x)*4+3]>10){ if(y<top)top=y; if(y>bottom)bottom=y; if(x<left)left=x; if(x>right)right=x; }
            }
            if(top>bottom||left>right) return canvas;
            const tw=right-left+1,th=bottom-top+1,tc=document.createElement('canvas');
            tc.width=tw; tc.height=th;
            tc.getContext('2d').drawImage(canvas,left,top,tw,th,0,0,tw,th);
            return tc;
        }

        function _nuScale(canvas, maxW, maxH) {
            const r=Math.min(maxW/canvas.width,maxH/canvas.height,1);
            const nw=Math.round(canvas.width*r),nh=Math.round(canvas.height*r);
            const out=document.createElement('canvas'); out.width=maxW; out.height=maxH;
            const ctx=out.getContext('2d');
            ctx.drawImage(canvas,0,0,canvas.width,canvas.height,Math.round((maxW-nw)/2),Math.round((maxH-nh)/2),nw,nh);
            return out;
        }

        async function _nuProcess(img, type, opts) {
            const c=document.createElement('canvas'); c.width=img.naturalWidth||img.width; c.height=img.naturalHeight||img.height;
            const ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
            if(opts.removeBg) { const id=ctx.getImageData(0,0,c.width,c.height); _nuRemoveColor(id,_nuDetectBg(id),opts.threshold); ctx.putImageData(id,0,0); }
            let res=c;
            if(opts.trim) res=_nuTrim(c);
            if(opts.scale) { const t=NU_TARGETS[type]; res=_nuScale(res,t.w,t.h); }
            return res.toDataURL('image/png');
        }

        function initNuImageProcessor() {
            const el = (id) => document.getElementById(id);
            const elType=el('nuImgprocType'), elFile=el('nuImgprocFile'), elPaste=el('nuImgprocPasteUrl');
            const elRemBg=el('nuImgprocRemoveBg'), elThresh=el('nuImgprocThreshold'), elThreshVal=el('nuImgprocThresholdVal');
            const elThreshRow=el('nuImgprocThresholdRow'), elTrim=el('nuImgprocTrim'), elScale=el('nuImgprocScale');
            const elProcess=el('nuImgprocProcess'), elOrigPrev=el('nuImgprocOrigPreview'), elResPrev=el('nuImgprocResultPreview');
            const elSimBox=el('nuImgprocSimBox'), elSimLL=el('nuImgprocSimLogoLeft'), elSimLR=el('nuImgprocSimLogoRight');
            const elSimFirma=el('nuImgprocSimFirma'), elSimFirmaImg=el('nuImgprocSimFirmaImg');
            const elActions=el('nuImgprocActions'), elDownload=el('nuImgprocDownload'), elCopyB64=el('nuImgprocCopyB64');
            const elApply=el('nuImgprocApply'), elB64Info=el('nuImgprocB64Info'), elLoad=el('nuImgprocLoadUploaded');

            if (!elType || !elProcess) return;

            function showOrig(img) {
                _nuOrigImg=img;
                elOrigPrev.innerHTML='';
                const p=document.createElement('img'); p.src=img.src; p.alt='Original';
                p.style.maxWidth='100%'; p.style.maxHeight='180px'; p.style.objectFit='contain';
                elOrigPrev.appendChild(p);
                elProcess.disabled=false;
                elResPrev.innerHTML='<span class="imgproc-placeholder">—</span>';
                elActions.style.display='none'; elSimBox.style.display='none'; elB64Info.style.display='none';
                _nuResultB64=null;
            }

            // Cargar desde uploads de Sección 6
            elLoad.addEventListener('click', async () => {
                const type=elType.value;
                let fileInput=null;
                if(type==='prof') fileInput=el('newLogoMedico');
                else if(type==='firma') fileInput=el('newFirma');
                else fileInput=el('newLogosInstituciones');

                if(!fileInput || !fileInput.files || !fileInput.files[0]) {
                    alert('No hay imagen subida de este tipo en la sección de arriba. Subí una primero.');
                    return;
                }
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                    try { const img=await _nuLoadImg(ev.target.result); showOrig(img); }
                    catch(e){ alert('Error: '+e.message); }
                };
                reader.readAsDataURL(fileInput.files[0]);
            });

            elFile.addEventListener('change', async(e)=>{
                const f=e.target.files[0]; if(!f) return;
                if(f.size>5*1024*1024){ alert('Max 5 MB'); elFile.value=''; return; }
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                    try { const img=await _nuLoadImg(ev.target.result); showOrig(img); }
                    catch(e){ alert('Error: '+e.message); }
                };
                reader.readAsDataURL(f);
            });

            elPaste.addEventListener('click', async()=>{
                const url=prompt('Pegá la URL de la imagen:');
                if(!url||!url.trim()) return;
                try { const img=await _nuLoadImg(url.trim()); showOrig(img); }
                catch(e){ alert('No se pudo cargar desde esa URL.'); }
            });

            elThresh.addEventListener('input',()=>{ elThreshVal.textContent=elThresh.value; });
            elRemBg.addEventListener('change',()=>{ elThreshRow.style.display=elRemBg.checked?'flex':'none'; });

            elProcess.addEventListener('click', async()=>{
                if(!_nuOrigImg) return;
                elProcess.disabled=true; elProcess.textContent='⏳ Procesando...';
                try {
                    const type=elType.value;
                    _nuResultB64=await _nuProcess(_nuOrigImg, type, {
                        removeBg:elRemBg.checked, threshold:parseInt(elThresh.value,10),
                        trim:elTrim.checked, scale:elScale.checked
                    });
                    elResPrev.innerHTML='';
                    const ri=document.createElement('img'); ri.src=_nuResultB64; ri.alt='Resultado';
                    ri.style.maxWidth='100%'; ri.style.maxHeight='180px'; ri.style.objectFit='contain';
                    elResPrev.appendChild(ri);

                    const kb=Math.round((_nuResultB64.length*3/4)/1024);
                    elB64Info.textContent='Tamaño: ~'+kb+' KB'; elB64Info.style.display='block';

                    // Sim PDF
                    elSimBox.style.display='block';
                    elSimLL.innerHTML=''; elSimLR.innerHTML=''; elSimFirma.style.display='none';
                    const si=document.createElement('img'); si.src=_nuResultB64;
                    si.style.maxWidth=type==='inst'?'70px':type==='prof'?'40px':'120px';
                    si.style.maxHeight=type==='inst'?'45px':type==='prof'?'40px':'50px';
                    if(type==='inst') elSimLL.appendChild(si);
                    else if(type==='prof') elSimLR.appendChild(si);
                    else { elSimFirma.style.display='block'; elSimFirmaImg.innerHTML=''; elSimFirmaImg.appendChild(si); }

                    elActions.style.display='flex';
                } catch(e){ alert('Error: '+e.message); }
                finally { elProcess.disabled=false; elProcess.textContent='⚙️ Procesar imagen'; }
            });

            elDownload.addEventListener('click',()=>{
                if(!_nuResultB64) return;
                const a=document.createElement('a');
                a.href=_nuResultB64;
                a.download=NU_TARGETS[elType.value].label.replace(/\s+/g,'_')+'_'+Date.now()+'.png';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            });

            elCopyB64.addEventListener('click', async()=>{
                if(!_nuResultB64) return;
                try { await navigator.clipboard.writeText(_nuResultB64); }
                catch(_){ const ta=document.createElement('textarea'); ta.value=_nuResultB64; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
                elCopyB64.textContent='✅ Copiado!';
                setTimeout(()=>{ elCopyB64.textContent='📋 Copiar Base64'; },2000);
            });

            elApply.addEventListener('click',()=>{
                if(!_nuResultB64) return;
                const type=elType.value;
                let prevId='';
                if(type==='prof') prevId='previewLogoMedico';
                else if(type==='firma') prevId='previewFirma';
                else prevId='previewLogosInst';
                const prev=document.getElementById(prevId);
                if(prev) prev.innerHTML='<img src="'+_nuResultB64+'" alt="Procesada" style="max-height:80px;">';
                if(typeof dashAlert==='function') dashAlert('✅ '+NU_TARGETS[type].label+' procesado y listo.','🖼️');
                else alert(NU_TARGETS[type].label+' aplicado.');
            });
        }

        if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initNuImageProcessor);
        else initNuImageProcessor();
    })();
    