(()=>{
  const API_MARK='/functions/v1/attendance-api';
  const nativeFetch=window.fetch.bind(window);
  const API_URL='https://unjcndjviwzshbqoapgx.supabase.co/functions/v1/attendance-api';
  async function api(action,body={}){const token=localStorage.getItem('sp_token')||'';const r=await nativeFetch(API_URL,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...body})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||j.error||'系統錯誤');return j}
  let reportAttemptId=null;
  let lastCreateSucceeded=false;
  const isVi=()=>localStorage.getItem('sp_lang')==='vi';
  const txt=(zh,vi)=>isVi()?vi:zh;

  window.fetch=async (input,init={})=>{
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const ct=(init.headers&&((init.headers['content-type'])||(init.headers['Content-Type'])))||'';
      if(url.includes(API_MARK)&&String(ct).includes('application/json')&&typeof init.body==='string'){
        const body=JSON.parse(init.body);
        if(body.action==='create_report'&&reportAttemptId){
          body.client_id=reportAttemptId;
          init={...init,body:JSON.stringify(body)};
          const r=await nativeFetch(input,init);
          if(r.ok)lastCreateSucceeded=true;
          return r;
        }
      }
    }catch{}
    return nativeFetch(input,init);
  };

  function modal(inner){
    const m=document.createElement('div');
    m.className='ux-modal';
    m.innerHTML='<div class="ux-panel">'+inner+'</div>';
    document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)m.remove()});
    return m;
  }

  function openNewReportPicker(){
    const m=modal('<div class="row"><h3 style="flex:1">'+txt('＋新增打卡','＋Thêm báo cáo')+'</h3><button class="btn" id="uxClose">✕</button></div><label>'+txt('選擇回報時段','Chọn thời điểm báo cáo')+'</label><select id="uxPeriod"><option value="morning">'+txt('早上到場','Báo cáo sáng')+'</option><option value="noon">'+txt('中午回報','Báo cáo trưa')+'</option><option value="evening">'+txt('下班回報','Báo cáo tan ca')+'</option></select><button class="btn primary" style="width:100%;margin-top:12px" id="uxStart">'+txt('新增打卡','Thêm báo cáo')+'</button>');
    m.querySelector('#uxClose').onclick=()=>m.remove();
    m.querySelector('#uxStart').onclick=()=>{
      const p=m.querySelector('#uxPeriod').value;
      m.remove();
      if(typeof window.reportForm==='function')window.reportForm(p);
    };
  }

  function patchReportButtons(){
    const buttons=[...document.querySelectorAll('.big[data-p]')];
    if(!buttons.length)return;
    const grid=buttons[0].parentElement;
    const card=grid&&grid.closest('.card');
    if(card&&!card.querySelector('#uxNewReport')){
      const b=document.createElement('button');
      b.id='uxNewReport';
      b.className='btn';
      b.style.cssText='width:100%;margin-top:10px';
      b.textContent=txt('＋新增打卡','＋Thêm báo cáo');
      b.onclick=openNewReportPicker;
      card.appendChild(b);
    }
    buttons.forEach(b=>{
      if(b.classList.contains('done')&&b.dataset.uxLocked!=='1'){
        b.dataset.uxLocked='1';
        b.disabled=true;
        b.style.cursor='default';
        b.style.opacity='1';
        b.title=txt('本時段已打卡；如需另一筆請按「＋新增打卡」','Đã báo cáo; nếu cần thêm, bấm “＋Thêm báo cáo”');
      }
    });
  }

  function patchReportForm(){
    const card=document.getElementById('reportCard');
    const send=document.getElementById('send');
    if(!card||!send||send.dataset.uxPatched==='1')return;
    send.dataset.uxPatched='1';
    reportAttemptId=crypto.randomUUID();
    lastCreateSucceeded=false;
    const old=send.onclick;
    let locked=false;
    send.onclick=async e=>{
      if(locked)return;
      locked=true;
      send.disabled=true;
      const oldText=send.textContent;
      send.textContent=txt('送出中…','Đang gửi…');
      try{
        await old?.call(send,e);
      }finally{
        if(lastCreateSucceeded){
          send.textContent=txt('已打卡 ✅','Đã báo cáo ✅');
        }else if(document.body.contains(send)){
          locked=false;
          send.disabled=false;
          send.textContent=oldText;
        }
      }
    };
  }

  function patchToolSection(){
    const toolbox=document.getElementById('toolbox');
    if(!toolbox)return;
    const card=toolbox.closest('.card');
    if(!card||card.dataset.uxTools==='1')return;
    card.dataset.uxTools='1';
    const h=card.querySelector('h3');
    if(h)h.textContent=txt('🧰 工具領用／歸還','🧰 Mượn / trả dụng cụ');
    toolbox.style.display='none';
    const b=document.createElement('button');
    b.className='btn';
    b.style.width='100%';
    b.textContent=txt('開啟工具表','Mở danh sách dụng cụ');
    b.onclick=()=>{
      const open=toolbox.style.display!=='none';
      toolbox.style.display=open?'none':'block';
      b.textContent=open?txt('開啟工具表','Mở danh sách dụng cụ'):txt('收合工具表','Thu gọn danh sách');
    };
    card.insertBefore(b,toolbox);
  }

  window.borrowTool=async id=>{
    let data;try{data=await api('bootstrap')}catch(e){return alert(e.message)}
    if(!data.sites?.length)return alert(txt('尚未建立工地','Chưa có công trường'));
    const tool=(data.tools||[]).find(t=>t.id===id);
    const name=isVi()?(tool?.name_vi||tool?.name):(tool?.name||'')+(tool?.name_vi?'｜'+tool.name_vi:'');
    const m=modal('<div class="row"><h3 style="flex:1">'+txt('工具領用','Mượn dụng cụ')+'</h3><button class="btn" id="uxClose">✕</button></div><div class="notice"><b>'+escapeHtml(name)+'</b></div><label>'+txt('選擇工地','Chọn công trường')+'</label><select id="uxSite">'+data.sites.map(s=>'<option value="'+s.id+'">'+escapeHtml(s.name)+'</option>').join('')+'</select><label>'+txt('數量','Số lượng')+'</label><input id="uxQty" type="number" min="1" step="1" value="1"><button class="btn primary" style="width:100%;margin-top:12px" id="uxBorrow">'+txt('確認領用','Xác nhận mượn')+'</button><div id="uxMsg"></div>');
    m.querySelector('#uxClose').onclick=()=>m.remove();
    m.querySelector('#uxBorrow').onclick=async()=>{
      const site_id=m.querySelector('#uxSite').value;
      const qty=Number(m.querySelector('#uxQty').value);
      const btn=m.querySelector('#uxBorrow');
      if(!site_id)return alert(txt('請選擇工地','Vui lòng chọn công trường'));
      if(!Number.isInteger(qty)||qty<1)return alert(txt('數量必須是1以上整數','Số lượng phải là số nguyên từ 1 trở lên'));
      btn.disabled=true;
      try{
        await api('tool_checkout',{tool_id:id,site_id,qty});
        m.querySelector('#uxMsg').innerHTML='<div class="notice good">✅ '+txt('領用成功','Mượn thành công')+'</div>';
        setTimeout(()=>{m.remove();window.render&&window.render()},500);
      }catch(e){alert(e.message);btn.disabled=false}
    };
  };

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  const css=document.createElement('style');
  css.textContent='.ux-modal{position:fixed;inset:0;background:#0008;z-index:120;display:flex;align-items:center;justify-content:center;padding:16px}.ux-panel{width:min(520px,100%);max-height:86vh;overflow:auto;background:white;border-radius:16px;padding:16px}.big:disabled{color:#111827}';
  document.head.appendChild(css);

  const observer=new MutationObserver(()=>{patchReportButtons();patchReportForm();patchToolSection()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  patchReportButtons();patchReportForm();patchToolSection();
})();