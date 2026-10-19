(function(root){
    'use strict';
    const MAX_PHOTO=3*1024*1024;
    function vietnamDate(now=new Date()) {
        const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
        return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
    }
    function validatePhoto(file) {
        if(!['image/jpeg','image/png'].includes(file.type)) return 'Chọn ảnh JPG hoặc PNG nhé.';
        return file.size>MAX_PHOTO?'Ảnh tối đa 3 MB.':'';
    }
    if(typeof module!=='undefined'&&module.exports)module.exports={vietnamDate,validatePhoto};
    if(typeof document==='undefined')return;
    document.addEventListener('DOMContentLoaded',async()=>{
        const form=document.getElementById('romantic-form');if(!form)return;
        const access=document.getElementById('card-access'),status=document.getElementById('card-status');
        const plans=document.getElementById('card-plans'),add=document.getElementById('add-card-plan');
        const preview=document.getElementById('card-preview'),previewState=document.getElementById('preview-state');
        const send=document.getElementById('card-send'),test=document.getElementById('card-test'),fields=document.getElementById('card-fields');
        let settings,imageData='',photoLoading=false,previewTimer,previewController,revision=0,sending=false,keys={};
        form.elements.namedItem('date').min=vietnamDate();
        function payload() {
            const data=Object.fromEntries(new FormData(form));
            for(const name of ['title','greeting','message','restaurant','outing','closing','signature','theme'])data[name]=(form.elements.namedItem(name).value||'').trim();
            data.date=form.elements.namedItem('date').value||null;data.time=form.elements.namedItem('time').value||null;
            data.plans=Array.from(plans.querySelectorAll('.romantic-plan')).map(row=>({time:row.querySelector('[data-plan-time]').value||null,activity:row.querySelector('[data-plan-activity]').value.trim(),place:row.querySelector('[data-plan-place]').value.trim()}));
            data.imageData=imageData||null;return data;
        }
        function queuePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,400);}
        async function updatePreview(){
            const current=++revision;
            if(previewController)previewController.abort();previewController=new AbortController();
            previewState.textContent='Đang cập nhật…';
            try {
                const response=await fetch('/api/romantic-cards/preview',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload()),signal:previewController.signal});
                if(!response.ok||response.redirected)throw Error('Chưa xem trước được. Kiểm tra đăng nhập hoặc nội dung thiệp.');
                const html=await response.text();if(current!==revision)return;preview.srcdoc=html;previewState.textContent='Đã cập nhật';
            }catch(e){if(e.name!=='AbortError'&&current===revision)previewState.textContent=e.message;}
        }
        function addPlan(time='',activity='',place=''){
            if(plans.children.length>=8)return;
            const row=document.createElement('div');row.className='romantic-plan';
            row.innerHTML='<div class="romantic-plan-top"><strong>Mốc lịch trình</strong><button type="button" class="romantic-text-button">Bỏ mốc này</button></div><label>Thời gian<input type="time" data-plan-time required></label><label>Hoạt động<input data-plan-activity maxlength="200" placeholder="Cùng em ăn tối…" required></label><label>Địa điểm của mốc này<input data-plan-place maxlength="200" placeholder="Tên địa điểm (không bắt buộc)"></label>';
            row.querySelector('[data-plan-time]').value=time;row.querySelector('[data-plan-activity]').value=activity;row.querySelector('[data-plan-place]').value=place;
            row.querySelector('button').addEventListener('click',()=>{row.remove();add.disabled=plans.children.length>=8;queuePreview();});
            plans.appendChild(row);add.disabled=plans.children.length>=8;queuePreview();
        }
        add.addEventListener('click',()=>addPlan());
        form.addEventListener('input',queuePreview);form.addEventListener('change',queuePreview);
        const photo=document.getElementById('card-photo'),removePhoto=document.getElementById('remove-card-photo');
        let photoRevision=0;
        photo.addEventListener('change',()=>{
            const current=++photoRevision;const file=photo.files[0];
            if(!file){photoLoading=false;imageData='';removePhoto.hidden=true;queuePreview();return;}
            const error=validatePhoto(file);
            if(error){photoLoading=false;imageData='';removePhoto.hidden=true;photo.value='';status.textContent=error;status.classList.add('is-error');queuePreview();return;}
            photoLoading=true;imageData='';
            const reader=new FileReader();
            reader.onload=()=>{if(current!==photoRevision)return;photoLoading=false;imageData=reader.result;removePhoto.hidden=false;queuePreview();};
            reader.onerror=()=>{if(current!==photoRevision)return;photoLoading=false;status.textContent='Chưa đọc được ảnh, anh chọn lại nhé.';};reader.readAsDataURL(file);
        });
        removePhoto.addEventListener('click',()=>{photoRevision++;photoLoading=false;photo.value='';imageData='';removePhoto.hidden=true;queuePreview();});
        async function deliver(isTest){
            if(sending)return;
            if(photoLoading){status.textContent='Đang đọc ảnh, anh chờ một chút nhé.';return;}
            if(!form.reportValidity())return;
            if(!plans.children.length){status.textContent='Thêm ít nhất một mốc lịch trình nhé.';status.classList.add('is-error');return;}
            const data=payload();
            if(!data.restaurant&&!data.outing){status.textContent='Chọn ít nhất một nơi đi ăn hoặc đi chơi nhé.';status.classList.add('is-error');return;}
            if(!isTest&&!settings.canSendLive)return;
            if(!isTest&&!window.confirm(`Gửi thiệp này tới ${settings.recipient}?`))return;
            const mode=isTest?'test':'live',fingerprint=JSON.stringify(data);
            if(keys[mode]?.fingerprint!==fingerprint)keys[mode]={fingerprint,id:crypto.randomUUID()};
            sending=true;fields.disabled=true;send.disabled=true;test.disabled=true;
            status.classList.remove('is-error');status.textContent='Đang gửi thiệp…';
            const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
            try {
                const response=await fetch('/api/romantic-cards/'+(isTest?'test':'send'),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,requestId:keys[mode].id}),signal:controller.signal});
                if(response.status===401||response.redirected)throw Error('Phiên đăng nhập đã hết. Đăng nhập lại rồi gửi nhé.');
                const result=await response.json();if(!response.ok||!result.success)throw Error(result.message||'Chưa gửi được thiệp.');
                status.textContent=result.message;
            }catch(e){status.classList.add('is-error');status.textContent=e.name==='AbortError'?'Chưa xác nhận được email đã gửi. Giữ nguyên nội dung và thử lại nhé.':e.message;}
            finally{clearTimeout(timeout);sending=false;fields.disabled=false;test.disabled=false;send.disabled=!settings.canSendLive;}
        }
        test.addEventListener('click',()=>deliver(true));form.addEventListener('submit',e=>{e.preventDefault();deliver(false);});
        try{
            const response=await fetch('/api/romantic-cards/settings',{credentials:'include'});
            if(response.status===401||response.redirected)throw Error('Anh đăng nhập bằng Hung452005 để viết thiệp nhé.');
            if(response.status===403)throw Error('Mục này dành riêng cho tài khoản Hung452005.');
            if(!response.ok)throw Error('Chưa tải được cấu hình gửi thiệp.');
            settings=await response.json();document.getElementById('card-recipient').textContent=`Thử: ${settings.testRecipient} · Thiệp thật: ${settings.recipient}`;
            document.getElementById('card-config-note').textContent=settings.canSendLive?'Xem trước kỹ rồi gửi thử cho anh trước khi gửi thiệp thật.':'Đã có địa chỉ nhận của Chi. Cần cấu hình địa chỉ gửi thuộc tên miền xác minh trên Resend để bật gửi thật; nút gửi thử vẫn dùng được.';
            send.disabled=!settings.canSendLive;access.hidden=true;document.getElementById('card-workspace').hidden=false;
            addPlan('18:30','Mình cùng ăn tối','');addPlan('20:00','Đi dạo và kể nhau nghe một ngày của mình','');
            clearTimeout(previewTimer);updatePreview();
        }catch(e){access.textContent=e.message;const link=document.createElement('a');link.href='/login.html';link.textContent=' Mở đăng nhập';access.appendChild(link);}
    });
})(typeof window!=='undefined'?window:globalThis);
