
/* Basic single-file web app (no backend). */
const $ = (id)=>document.getElementById(id);

const state = {
  selectedStages: new Set(),
  classCounts: {},
  teachers: [],
  assignments: null,
  schedule: null,
  standby: {},
  assignmentEdits: {},
};

function uid(prefix){ return prefix + Math.random().toString(16).slice(2,10); }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

function addAlert(msg, kind="warn"){
  const wrap = $("alerts");
  const badge = kind==="ok"?"ok":(kind==="bad"?"bad":"warn");
  wrap.innerHTML += `<div class="alert"><span class="badge ${badge}">${kind==="ok"?"تم":(kind==="bad"?"تنبيه":"ملاحظة")}</span> ${escapeHtml(msg)}</div>`;
}
function clearAlerts(){ $("alerts").innerHTML=""; }

// UI: stages
function renderStages(){
  const wrap = $("stages");
  wrap.innerHTML = STAGES.map(s=>`
    <label class="card" style="margin:0">
      <div class="row">
        <input type="checkbox" data-stage="${s.id}" />
        <div>
          <div><strong>${s.name}</strong></div>
          <div class="hint">يظهر الصفوف المتاحة بعد الاختيار</div>
        </div>
      </div>
    </label>
  `).join("");
  wrap.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id = cb.dataset.stage;
      if(cb.checked) state.selectedStages.add(id); else state.selectedStages.delete(id);
      renderGradesConfig();
    });
  });
}
function gradeLabel(stageId, grade){
  const g = Number(grade);
  return stageId.startsWith("prim") ? `الصف ${g} ابتدائي` : `الصف ${g} متوسط`;
}
function renderGradesConfig(){
  const wrap = $("gradesConfig");
  let html = "";
  for(const sid of state.selectedStages){
    const grades = Object.keys(CURRICULUM[sid] || {});
    html += `<div class="card" style="margin:10px 0">
      <div class="row"><strong>${STAGES.find(x=>x.id===sid)?.name||sid}</strong></div>
      <table>
        <thead><tr><th>الصف</th><th>عدد الفصول</th><th>إجمالي الحصص/فصل</th></tr></thead>
        <tbody>
        ${grades.map(g=>{
          const key = `${sid}:${g}`;
          const val = state.classCounts[key] ?? 0;
          const tot = CURRICULUM[sid][g].total;
          return `<tr>
            <td>${gradeLabel(sid,g)}</td>
            <td><input type="number" min="0" max="30" value="${val}" data-grade="${key}" style="width:90px" /></td>
            <td>${tot}</td>
          </tr>`;
        }).join("")}
        </tbody>
      </table>
    </div>`;
  }
  wrap.innerHTML = html || `<div class="hint">اختر مرحلة لعرض الصفوف.</div>`;
  wrap.querySelectorAll("input[data-grade]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      state.classCounts[inp.dataset.grade] = Number(inp.value||0);
      refreshSectionSelect();
    });
  });
  refreshSectionSelect();
}

// Teachers
function specSelectOptions(){
  $("tSpec").innerHTML = SPEC_OPTIONS.map(s=>`<option>${s}</option>`).join("");
}
function renderTeachers(){
  const wrap = $("teachersTable");
  if(state.teachers.length===0){
    wrap.innerHTML = `<div class="hint">لم يتم إضافة معلمين بعد.</div>`;
    refreshTeacherSelect();
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr><th>#</th><th>الاسم</th><th>التخصص</th><th>النصاب</th><th class="no-print">حذف</th></tr></thead>
    <tbody>
      ${state.teachers.map((t,i)=>`<tr>
        <td>${i+1}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.spec)}</td>
        <td>${t.max}</td>
        <td class="no-print"><button class="btn btn-danger" data-del="${t.id}">حذف</button></td>
      </tr>`).join("")}
    </tbody>
  </table>`;
  wrap.querySelectorAll("button[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.dataset.del;
      state.teachers = state.teachers.filter(x=>x.id!==id);
      delete state.standby[id];
      state.assignments=null; state.schedule=null;
      renderTeachers();
      renderAssignmentSummary();
      renderStandbyConfig();
    });
  });
  refreshTeacherSelect();
}
function refreshTeacherSelect(){
  const sel = $("teacherSelect");
  sel.innerHTML = `<option value="">-- اختر --</option>` + state.teachers.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.spec)})</option>`).join("");
}

// Sections meta
function buildSectionsMeta(){
  const out = [];
  for(const [k,n] of Object.entries(state.classCounts)){
    const count = Number(n||0);
    if(count<=0) continue;
    const [sid, grade] = k.split(":");
    for(let i=1;i<=count;i++){
      const total = CURRICULUM[sid][grade].total;
      out.push({
        key:`${sid}:${grade}:${i}`,
        label:`${STAGES.find(x=>x.id===sid)?.name||sid} - ${gradeLabel(sid,grade)} / ${i}`,
        stageId:sid, grade, sectionNo:i, total
      });
    }
  }
  out.sort((a,b)=>a.key.localeCompare(b.key));
  return out;
}
function refreshSectionSelect(){
  const sel = $("sectionSelect");
  const secs = buildSectionsMeta();
  sel.innerHTML = `<option value="">-- اختر --</option>` + secs.map(s=>`<option value="${s.key}">${escapeHtml(s.label)}</option>`).join("");

  const esel = $("editSectionSelect");
  if(esel){
    esel.innerHTML = `<option value="">-- اختر --</option>` + secs.map(s=>`<option value="${s.key}">${escapeHtml(s.label)}</option>`).join("");
  }
}
function sectionLabel(sectionKey){
  const [sid,grade,sec] = sectionKey.split(":");
  return `${STAGES.find(x=>x.id===sid)?.name||sid} - ${gradeLabel(sid,grade)} / ${sec}`;
}

// Demand
function computeDemand(){
  const sections = buildSectionsMeta();
  const perSection = {};
  for(const s of sections){
    const cur = CURRICULUM[s.stageId][s.grade].hours;
    perSection[s.key] = Object.entries(cur).map(([subj,hrs])=>({subject:subj, hours:hrs}));
  }
  return {sections, perSection};
}

// Assignment engine
function assignSubjects(){
  clearAlerts();
  const {sections, perSection} = computeDemand();
  if(sections.length===0){ addAlert("اختر مراحل وأدخل عدد الفصول أولاً.","bad"); return; }
  if(state.teachers.length===0){ addAlert("أضف المعلمين أولاً.","bad"); return; }

  const remaining = {};
  for(const t of state.teachers) remaining[t.id]=t.max;

  const byTeacher = {};
  const bySection = {};
  const unassigned = [];

  for(const s of sections){
    const sk = s.key;
    bySection[sk]=[];
    const needs = perSection[sk].slice().sort((a,b)=>b.hours-a.hours);
    for(const need of needs){
      let left = need.hours;
      const prefs = SUBJECT_PREFS[need.subject] || [];
      const primary = state.teachers.filter(t=>prefs.includes(t.spec)).sort((a,b)=>(remaining[b.id]-remaining[a.id]));
      const fallback = state.teachers.filter(t=>remaining[t.id]>0).sort((a,b)=>(remaining[b.id]-remaining[a.id]));
      for(const pool of [primary, fallback]){
        for(const t of pool){
          if(left<=0) break;
          const can = Math.min(left, remaining[t.id]);
          if(can<=0) continue;
          remaining[t.id]-=can; left-=can;
          bySection[sk].push({subject:need.subject, teacherId:t.id, hours:can});
          if(!byTeacher[t.id]) byTeacher[t.id]={teacher:t, items:[]};
          byTeacher[t.id].items.push({sectionKey:sk, subject:need.subject, hours:can});
        }
        if(left<=0) break;
      }
      if(left>0) unassigned.push({sectionKey:sk, subject:need.subject, hours:left});
    }
  }

  state.assignments = {byTeacher, bySection, unassigned, remaining};
  state.schedule=null;
  state.assignmentEdits = {};
  renderAssignmentSummary();
  renderAssignmentEditor();
  renderAllAssignmentsTable();
  renderStandbyConfig();
  renderScheduleViews();
  addAlert("تم إنشاء الإسناد. حدّد الانتظار ثم أنشئ الجدول.","ok");
}

function renderAssignmentSummary(){
  const wrap = $("assignmentSummary");
  if(!state.assignments){ wrap.innerHTML = `<div class="hint">لم يتم الإسناد بعد.</div>`; $("unassignedSummary").innerHTML=""; return; }
  const {byTeacher, remaining} = state.assignments;
  const rows = state.teachers.map(t=>{
    const items = byTeacher[t.id]?.items || [];
    const load = items.reduce((s,x)=>s+x.hours,0);
    const rem = remaining[t.id] ?? (t.max-load);
    // تفاصيل دقيقة: المادة + الفصل (الصف/الفصل)
    const map = new Map();
    for(const it of items){
      const k = `${it.subject}||${it.sectionKey}`;
      map.set(k, (map.get(k)||0) + it.hours);
    }
    const details = Array.from(map.entries())
      .map(([k,h])=>{
        const [subj, sk] = k.split("||");
        return {subj, sk, h};
      })
      .sort((a,b)=> (b.h-a.h) || a.subj.localeCompare(b.subj) || a.sk.localeCompare(b.sk))
      .map(x=>`${x.subj} - ${sectionLabel(x.sk)} (${x.h})`)
      .join("<br>");
    return `<tr>
      <td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.spec)}</td><td>${t.max}</td><td>${load}</td><td>${rem}</td>
      <td style="text-align:right">${details || "-"}</td>
    </tr>`;
  }).join("");
  wrap.innerHTML = `<table>
    <thead><tr><th>المعلم</th><th>التخصص</th><th>النصاب</th><th>المسند</th><th>المتبقي</th><th>تفاصيل</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  // unassigned
  const un = state.assignments.unassigned || [];
  const uwrap = $("unassignedSummary");
  if(un.length===0){ uwrap.innerHTML = `<div class="badge ok">لا توجد حصص غير مسندة</div>`; }
  else{
    const rows2 = un.map(u=>`<tr><td>${escapeHtml(sectionLabel(u.sectionKey))}</td><td>${escapeHtml(u.subject)}</td><td>${u.hours}</td></tr>`).join("");
    uwrap.innerHTML = `<div class="badge warn">يوجد عجز/حصص غير مسندة</div>
      <table><thead><tr><th>الفصل</th><th>المادة</th><th>حصص</th></tr></thead><tbody>${rows2}</tbody></table>`;
  }
}

// --- Manual assignment editing + comprehensive assignments table ---

function preferredTeachersForSubject(subject){
  const prefs = SUBJECT_PREFS[subject] || [];
  const preferred = state.teachers.filter(t=>prefs.includes(t.spec));
  const others = state.teachers.filter(t=>!prefs.includes(t.spec));
  return {preferred, others};
}

function rebuildAssignmentsFromBySection(){
  // Build teacher view + remaining from bySection, and rebuild unassigned from curriculum demand.
  const {sections, perSection} = computeDemand();
  const bySection = state.assignments?.bySection || {};

  for(const s of sections){ if(!bySection[s.key]) bySection[s.key]=[]; }

  const byTeacher = {};
  const remaining = {};
  for(const t of state.teachers) remaining[t.id]=t.max;

  for(const [sk, items] of Object.entries(bySection)){
    for(const it of (items||[])){
      if(!it.teacherId) continue;
      const t = state.teachers.find(x=>x.id===it.teacherId);
      if(!t) continue;
      remaining[t.id] = (remaining[t.id]??t.max) - Number(it.hours||0);
      if(!byTeacher[t.id]) byTeacher[t.id]={teacher:t, items:[]};
      byTeacher[t.id].items.push({sectionKey:sk, subject:it.subject, hours:Number(it.hours||0)});
    }
  }

  const unassigned = [];
  for(const s of sections){
    const needs = perSection[s.key] || [];
    const assigned = bySection[s.key] || [];
    const sumBySubj = {};
    for(const a of assigned) sumBySubj[a.subject]=(sumBySubj[a.subject]||0)+Number(a.hours||0);
    for(const need of needs){
      const have = sumBySubj[need.subject]||0;
      const diff = Number(need.hours||0) - have;
      if(diff>0) unassigned.push({sectionKey:s.key, subject:need.subject, hours:diff});
    }
  }

  state.assignments = {byTeacher, bySection, unassigned, remaining};
}

function renderAssignmentEditor(){
  const wrap = $("assignmentEditor");
  if(!wrap) return;
  if(!state.assignments){
    wrap.innerHTML = `<div class="hint">نفّذ الإسناد أولاً لتمكين التعديل اليدوي.</div>`;
    return;
  }
  const sk = $("editSectionSelect")?.value;
  if(!sk){
    wrap.innerHTML = `<div class="hint">اختر فصلًا لعرض موادّه للتعديل.</div>`;
    return;
  }

  const [sid, grade] = sk.split(":");
  const demands = CURRICULUM[sid]?.[grade]?.hours || {};
  const current = state.assignments.bySection?.[sk] || [];

  const allocBySubj = {};
  for(const it of current){
    if(!allocBySubj[it.subject]) allocBySubj[it.subject]=[];
    allocBySubj[it.subject].push({teacherId:it.teacherId||null, hours:Number(it.hours||0)});
  }

  const rows = Object.entries(demands).map(([subject, needHours])=>{
    const alloc = allocBySubj[subject] || [];
    const assignedTotal = alloc.reduce((s,x)=>s+x.hours,0);
    const un = Math.max(0, Number(needHours) - assignedTotal);
    const teacherParts = alloc.filter(a=>a.teacherId).map(a=>{
      const tn = state.teachers.find(t=>t.id===a.teacherId)?.name || "";
      return `${tn} (${a.hours})`;
    });
    const currentTxt = teacherParts.length ? teacherParts.join(" + ") : (assignedTotal>0?"(معلم غير معروف)":"غير مسند");
    let currentTid = "";
    if(alloc.length){
      const best = alloc.filter(a=>a.teacherId).sort((a,b)=>b.hours-a.hours)[0];
      currentTid = best?.teacherId || "";
    }
    const key = `${sk}||${subject}`;
    const pending = Object.prototype.hasOwnProperty.call(state.assignmentEdits, key) ? state.assignmentEdits[key] : currentTid;

    const {preferred, others} = preferredTeachersForSubject(subject);
    const optPreferred = preferred.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.spec)})</option>`).join("");
    const optOthers = others.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} (${escapeHtml(t.spec)})</option>`).join("");

    return `<tr data-edit-row="${escapeHtml(key)}">
      <td>${escapeHtml(subject)}</td>
      <td>${needHours}</td>
      <td>${assignedTotal}</td>
      <td>${un}</td>
      <td style="text-align:right">${escapeHtml(currentTxt)}</td>
      <td>
        <select data-edit="${escapeHtml(key)}">
          <option value="">غير مسند</option>
          ${optPreferred?`<optgroup label="مناسب">${optPreferred}</optgroup>`:""}
          ${optOthers?`<optgroup label="باقي المعلمين">${optOthers}</optgroup>`:""}
        </select>
      </td>
    </tr>`;
  }).join("");

  wrap.innerHTML = `
    <div class="row"><strong>${escapeHtml(sectionLabel(sk))}</strong></div>
    <table>
      <thead>
        <tr><th>المادة</th><th>المطلوب</th><th>المسند</th><th>غير مسند</th><th>المعلم الحالي</th><th>تغيير الإسناد إلى</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="hint">ملاحظة: عند اختيار معلم جديد سيتم إسناد كامل حصص المادة لهذا الفصل إلى المعلم المختار (بدل التوزيع الجزئي). إن لم يكفِ النصاب سيظهر تنبيه.</div>
  `;

  wrap.querySelectorAll("select[data-edit]").forEach(sel=>{
    const k = sel.dataset.edit;
    sel.value = state.assignmentEdits[k] ?? sel.value;
    sel.addEventListener("change", ()=>{
      state.assignmentEdits[k] = sel.value; // "" => غير مسند
      const tr = sel.closest("tr");
      if(tr) tr.classList.add("modified");
    });
  });
}

function applyAssignmentEdits(){
  if(!state.assignments){ addAlert("نفّذ الإسناد أولاً.","bad"); return; }
  const edits = state.assignmentEdits || {};
  const keys = Object.keys(edits);
  if(keys.length===0){ addAlert("لا توجد تعديلات محفوظة.","warn"); return; }

  const bySection = state.assignments.bySection || (state.assignments.bySection = {});

  for(const k of keys){
    const [sk, subject] = k.split("||");
    const newTid = edits[k] || null;
    const [sid, grade] = sk.split(":");
    const need = CURRICULUM[sid]?.[grade]?.hours?.[subject];
    if(need===undefined) continue;

    // remove current allocations of this subject for this section
    bySection[sk] = (bySection[sk]||[]).filter(x=>x.subject!==subject);

    if(newTid){
      // compute current loads after removal
      const loads = {};
      for(const t of state.teachers) loads[t.id]=0;
      for(const items of Object.values(bySection)){
        for(const it of (items||[])){
          if(it.teacherId) loads[it.teacherId]=(loads[it.teacherId]||0)+Number(it.hours||0);
        }
      }
      const t = state.teachers.find(x=>x.id===newTid);
      if(!t){ addAlert(`لم يتم العثور على المعلم المحدد للمادة ${subject}.`,"bad"); continue; }
      if((loads[newTid]||0) + Number(need) > t.max){
        addAlert(`تعذر تعديل إسناد (${subject}) لـ ${sectionLabel(sk)}: نصاب المعلم ${t.name} لا يكفي.`,"bad");
        continue;
      }
      bySection[sk].push({subject, teacherId:newTid, hours:Number(need)});
    }
  }

  state.assignmentEdits = {};
  rebuildAssignmentsFromBySection();
  state.schedule = null;
  renderAssignmentSummary();
  renderAllAssignmentsTable();
  renderStandbyConfig();
  renderScheduleViews();
  addAlert("تم حفظ تعديلات الإسناد. أنشئ الجدول من جديد لتطبيقها.","ok");
}

function renderAllAssignmentsTable(){
  const wrap = $("allAssignments");
  if(!wrap) return;
  if(!state.assignments){
    wrap.innerHTML = `<div class="hint">نفّذ الإسناد أولاً لعرض الجدول الشامل.</div>`;
    return;
  }
  const {sections, perSection} = computeDemand();
  const bySection = state.assignments.bySection || {};
  const rows = [];
  for(const s of sections){
    const sk = s.key;
    const needs = perSection[sk] || [];
    const alloc = bySection[sk] || [];
    const allocBySubj = {};
    for(const a of alloc){
      if(!allocBySubj[a.subject]) allocBySubj[a.subject]=[];
      allocBySubj[a.subject].push({teacherId:a.teacherId||null, hours:Number(a.hours||0)});
    }
    for(const need of needs){
      const parts = allocBySubj[need.subject] || [];
      const assigned = parts.reduce((x,y)=>x+y.hours,0);
      const missing = Math.max(0, need.hours - assigned);
      const teacherTxt = parts.filter(p=>p.teacherId).length
        ? parts.filter(p=>p.teacherId).map(p=>{
            const tn = state.teachers.find(t=>t.id===p.teacherId)?.name || "";
            return `${tn} (${p.hours})`;
          }).join(" + ")
        : (assigned>0?"(معلم غير معروف)":"غير مسند");
      rows.push({section: sectionLabel(sk), subject: need.subject, teachers: teacherTxt, need: need.hours, assigned, missing});
    }
  }
  const htmlRows = rows.map(r=>`<tr>
    <td style="text-align:right">${escapeHtml(r.section)}</td>
    <td>${escapeHtml(r.subject)}</td>
    <td style="text-align:right">${escapeHtml(r.teachers)}</td>
    <td>${r.need}</td>
    <td>${r.assigned}</td>
    <td>${r.missing?`<span class="badge warn">${r.missing}</span>`:`<span class="badge ok">0</span>`}</td>
  </tr>`).join("");
  wrap.innerHTML = `<table>
    <thead><tr><th>الفصل</th><th>المادة</th><th>المعلم/ون</th><th>المطلوب</th><th>المسند</th><th>غير مسند</th></tr></thead>
    <tbody>${htmlRows}</tbody>
  </table>`;
}

// Standby config
function renderStandbyConfig(){
  const wrap = $("standbyConfig");
  if(!state.assignments){ wrap.innerHTML = `<div class="hint">نفّذ الإسناد أولاً.</div>`; $("standbyReports").innerHTML=""; return; }
  const {remaining} = state.assignments;
  const rows = state.teachers.map(t=>{
    const rem = remaining[t.id] ?? 0;
    const val = Number(state.standby[t.id]||0);
    return `<tr>
      <td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.spec)}</td><td>${t.max}</td><td>${t.max-rem}</td><td>${rem}</td>
      <td><input type="number" min="0" max="${rem}" value="${val}" data-standby="${t.id}" style="width:90px"/></td>
    </tr>`;
  }).join("");
  wrap.innerHTML = `<table>
    <thead><tr><th>المعلم</th><th>التخصص</th><th>النصاب</th><th>المسند</th><th>المتبقي</th><th>انتظار</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="no-print"><button id="btnApplyStandby" class="btn">تطبيق الانتظار</button></div>`;
  wrap.querySelectorAll("input[data-standby]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const tid = inp.dataset.standby;
      const max = Number(inp.max||0);
      let v = Number(inp.value||0);
      if(isNaN(v)) v=0;
      v = Math.max(0, Math.min(max, v));
      inp.value = v;
      state.standby[tid]=v;
    });
  });
  $("btnApplyStandby").onclick = ()=>{
    addAlert("تم حفظ حصص الانتظار.","ok");
    renderStandbyReports();
  };
  renderStandbyReports();
}
function renderStandbyReports(afterSchedule=false){
  const wrap = $("standbyReports");
  if(!state.assignments){ wrap.innerHTML=""; return; }
  const placed = afterSchedule ? (state.schedule?.standbyPlaced||{}) : {};
  const rows = state.teachers.map(t=>{
    const des = Number(state.standby[t.id]||0);
    const plc = afterSchedule ? (placed[t.id]||0) : "";
    const rem = afterSchedule ? Math.max(0, des-(placed[t.id]||0)) : "";
    const status = afterSchedule ? `<span class="badge ${(plc===des)?"ok":"warn"}">${(plc===des)?"مكتمل":"غير مكتمل"}</span>` : "";
    return `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.spec)}</td><td>${des}</td>${afterSchedule?`<td>${plc}</td><td>${rem}</td><td>${status}</td>`:""}</tr>`;
  }).join("");
  wrap.innerHTML = afterSchedule
    ? `<table><thead><tr><th>المعلم</th><th>التخصص</th><th>مطلوب</th><th>مجدول</th><th>متبقي</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<table><thead><tr><th>المعلم</th><th>التخصص</th><th>انتظار مطلوب</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Scheduling
function emptySectionGrid(total){
  const lens = dayLengthsForTotal(total);
  const grid = [];
  for(let d=0;d<5;d++){
    const row = new Array(7).fill(null);
    for(let p=0;p<7;p++){
      row[p] = (p<lens[d]) ? "" : null;
    }
    grid.push(row);
  }
  return {grid,lens};
}
function buildSchedule(){
  clearAlerts();
  if(!state.assignments){ addAlert("نفّذ الإسناد أولاً.","bad"); return; }
  const sections = buildSectionsMeta();
  if(sections.length===0){ addAlert("لا توجد فصول.","bad"); return; }

  // خيار: تعبئة الجدول بالكامل لتقليل/إلغاء الفراغات عند التعذر
  // (يبقي منع تعارض المعلم دائمًا)
  const forceFill = Boolean($("chkForceFill")?.checked);

  // lessons per section expanded (base)
  const lessonsBySectionBase = {};
  for(const s of sections){
    const ass = state.assignments.bySection[s.key] || [];
    const expanded = [];
    for(const it of ass){
      for(let i=0;i<it.hours;i++) expanded.push({subject:it.subject, teacherId:it.teacherId});
    }
    const un = (state.assignments.unassigned||[]).filter(u=>u.sectionKey===s.key);
    for(const u of un){
      for(let i=0;i<u.hours;i++) expanded.push({subject:u.subject, teacherId:null});
    }
    // order by frequency desc (stable base), then will add light randomization in attempts
    const freq = {};
    for(const l of expanded) freq[l.subject]=(freq[l.subject]||0)+1;
    expanded.sort((a,b)=>(freq[b.subject]-freq[a.subject]));
    lessonsBySectionBase[s.key]=expanded;
  }

  function weeklyHours(sectionKey){
    const [sid,grade]=sectionKey.split(":");
    return CURRICULUM[sid][grade].hours;
  }

  function canPlace(teacherOcc, sectionKey, grid, lens, day, period, lesson, relaxRules){
    if(grid[day][period] !== "") return false;
    if(lesson.teacherId && teacherOcc[lesson.teacherId][day][period] !== null) return false;

    // عند تفعيل "تعبئة كاملة" في مرحلة الإصلاح/الملء، نخفف القيود غير الحرجة
    if(relaxRules) return true;

    const subj = lesson.subject;
    if(CONSTRAINTS.noConsecutive.has(subj)){
      const left = period>0 ? grid[day][period-1] : null;
      const right = period<6 ? grid[day][period+1] : null;
      if(left && left.subject===subj) return false;
      if(right && right.subject===subj) return false;
    }
    if(CONSTRAINTS.maxConsecutive2.has(subj)){
      const p0 = period-2>=0 ? grid[day][period-2] : null;
      const p1 = period-1>=0 ? grid[day][period-1] : null;
      const p2 = period+1<=6 ? grid[day][period+1] : null;
      const p3 = period+2<=6 ? grid[day][period+2] : null;
      if(p0 && p1 && p0.subject===subj && p1.subject===subj) return false;
      if(p1 && p2 && p1.subject===subj && p2.subject===subj) return false;
      if(p2 && p3 && p2.subject===subj && p3.subject===subj) return false;
    }
    const wh = weeklyHours(sectionKey);
    const weekly = wh[subj];
    if(CONSTRAINTS.noRepeatIfWeeklyLE5 && weekly!==undefined && weekly<=5){
      for(let p=0;p<lens[day];p++){
        const c = grid[day][p];
        if(c && c.subject===subj) return false;
      }
    }
    return true;
  }

  function scoreSlot(grid, day, period, lesson){
    let sc=0;
    const subj=lesson.subject;
    // avoid always same period
    let same=0;
    for(let d=0;d<5;d++){
      const c = grid[d][period];
      if(c && c.subject===subj) same++;
    }
    sc -= same*2;
    // slight preference to fill earlier to reduce leftover
    sc += (6-period)*0.05;
    return sc;
  }

  function shuffleInPlace(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function buildOnce(relaxRules){
    // teacher occupancy (fresh)
    const teacherOcc = {};
    for(const t of state.teachers){
      teacherOcc[t.id]=Array.from({length:5},()=>Array(7).fill(null));
    }
    const sectionSchedules = {};
    const unscheduled = [];

    // iterate sections in a lightly randomized order to reduce clashes
    const secOrder = sections.slice();
    shuffleInPlace(secOrder);

    for(const s of secOrder){
      const {grid,lens} = emptySectionGrid(s.total);
      const lessons = lessonsBySectionBase[s.key].slice();
      // randomize within same frequency band a bit
      shuffleInPlace(lessons);
      for(const lesson of lessons){
        let best=null;
        for(let d=0;d<5;d++){
          for(let p=0;p<7;p++){
            if(p>=lens[d]) continue;
            if(!canPlace(teacherOcc, s.key,grid,lens,d,p,lesson,relaxRules)) continue;
            // add tiny noise to avoid systematic bias
            const sc = scoreSlot(grid,d,p,lesson) + (Math.random()*0.01);
            if(!best || sc>best.sc) best={d,p,sc};
          }
        }
        if(best){
          grid[best.d][best.p]={subject:lesson.subject, teacherId:lesson.teacherId};
          if(lesson.teacherId) teacherOcc[lesson.teacherId][best.d][best.p]=s.key;
        }else{
          unscheduled.push({sectionKey:s.key, subject:lesson.subject, teacherId:lesson.teacherId});
        }
      }
      sectionSchedules[s.key]={meta:s,grid,lens};
    }

    return {teacherOcc, sectionSchedules, unscheduled, relaxRules};
  }

  function bestOf(attempts, relaxRules){
    let best=null;
    for(let i=0;i<attempts;i++){
      const run = buildOnce(relaxRules);
      if(!best || run.unscheduled.length < best.unscheduled.length){
        best = run;
        if(best.unscheduled.length===0) break;
      }
    }
    return best;
  }

  // المرحلة 1: صارمة
  const strictRun = bestOf(12, false);
  // المرحلة 2: (اختياري) تخفيف قيود لتقليل الفراغات
  const relaxedRun = forceFill ? bestOf(30, true) : null;

  let bestRun = strictRun;
  if(relaxedRun && relaxedRun.unscheduled.length < strictRun.unscheduled.length) bestRun = relaxedRun;

  const teacherOcc = bestRun.teacherOcc;
  const sectionSchedules = bestRun.sectionSchedules;
  let unscheduled = bestRun.unscheduled.slice();

  // إصلاح إضافي: حاول ملء الحصص المتعذرة في أي خانة فارغة مناسبة
  if(forceFill && unscheduled.length){
    const remaining = [];
    for(const u of unscheduled){
      const sch = sectionSchedules[u.sectionKey];
      if(!sch){ remaining.push(u); continue; }
      const {grid,lens} = sch;
      let placed=false;
      for(let d=0; d<5 && !placed; d++){
        for(let p=0; p<7 && !placed; p++){
          if(p>=lens[d]) continue;
          if(grid[d][p]!=="") continue;
          if(u.teacherId && teacherOcc[u.teacherId][d][p] !== null) continue;
          grid[d][p] = {subject:u.subject, teacherId:u.teacherId};
          if(u.teacherId) teacherOcc[u.teacherId][d][p] = u.sectionKey;
          placed=true;
        }
      }
      if(!placed) remaining.push(u);
    }
    unscheduled = remaining;
  }

  // تعبئة نهائية: امنع الفراغات في جداول الفصول (نشاط/مراجعة) عند التعذر
  const fillerCounts = {};
  if(forceFill){
    for(const [sk, sch] of Object.entries(sectionSchedules)){
      let fc=0;
      for(let d=0; d<5; d++){
        for(let p=0; p<7; p++){
          if(p>=sch.lens[d]) continue;
          if(sch.grid[d][p] === ""){
            sch.grid[d][p] = {subject:SUBJECTS.FILLER, teacherId:null, filler:true};
            fc++;
          }
        }
      }
      if(fc) fillerCounts[sk]=fc;
    }
  }

  // derive global lens (school day)
  const globalLens = sections.some(x=>x.total===33) ? [7,7,7,6,6] : [7,7,7,7,7];

  // place standby inside teacher grids, last periods first, respecting globalLens
  const standbyPlaced = {};
  for(const t of state.teachers){
    let desired = Number(state.standby[t.id]||0);
    standbyPlaced[t.id]=0;
    if(desired<=0) continue;
    // توزيع الانتظار على أيام متفرقة قدر الإمكان (Round-robin على الأيام)
    const dayOrder=[4,3,2,1,0]; // نفضل آخر الأسبوع وآخر اليوم
    const periodOrder=[6,5,4,3,2,1,0];
    // جهّز مرشحين لكل يوم
    const candidates = dayOrder.map(d=>{
      const slots=[];
      for(const p of periodOrder){
        if(p>=globalLens[d]) continue;
        if(teacherOcc[t.id][d][p]!==null) continue;
        slots.push(p);
      }
      return {d, slots};
    });
    let progressed=true;
    while(desired>0 && progressed){
      progressed=false;
      for(const c of candidates){
        if(desired<=0) break;
        const p = c.slots.shift();
        if(p===undefined) continue;
        // قد تكون امتلأت أثناء الجدولة (نادر)؛ تحقق ثانية
        if(teacherOcc[t.id][c.d][p]!==null) continue;
        teacherOcc[t.id][c.d][p]=SUBJECTS.STANDBY;
        desired--; standbyPlaced[t.id]++;
        progressed=true;
      }
    }
  }

  // build teacher printable grids
  const teacherSchedules = {};
  for(const t of state.teachers){
    const g = Array.from({length:5},(_,d)=>Array.from({length:7},(_,p)=>{
      const v = teacherOcc[t.id][d][p];
      return v===null ? "" : v;
    }));
    // خزّن نسخة مبسطة قابلة للتصدير/الاستيراد بدون مراجع إضافية
    const teacherMeta = {id:t.id, name:t.name, spec:t.spec, max:t.max};
    teacherSchedules[t.id]={teacher:teacherMeta, grid:g};
  }

  state.schedule={sections:sectionSchedules, teachers:teacherSchedules, unscheduled, standbyPlaced, globalLens, fillerCounts};
  renderScheduleViews();
  renderStandbyReports(true);
  renderUnscheduledReport();
  if(unscheduled.length) addAlert(`تعذر جدولة ${unscheduled.length} حصة بسبب القيود/التعارضات. (انظر تقرير التعذر في الصفحة)`, "warn");
  else addAlert("تم إنشاء الجدول المبدئي بدون حصص متعذرة.","ok");
}

function renderUnscheduledReport(){
  const wrap = $("unscheduledReport");
  if(!wrap) return;
  if(!state.schedule){ wrap.innerHTML = `<div class="hint">أنشئ الجدول أولاً لعرض التقرير.</div>`; return; }
  const list = state.schedule.unscheduled || [];
  const fillerCounts = state.schedule.fillerCounts || {};
  const fillerTotal = Object.values(fillerCounts).reduce((a,b)=>a+Number(b||0),0);
  if(list.length===0){
    wrap.innerHTML = fillerTotal
      ? `<div class="badge warn">تمت تعبئة ${fillerTotal} حصص بنشاط/مراجعة لمنع الفراغات (تحقّق من الإسناد إذا رغبت أن تكون جميعها مواد).</div>`
      : `<div class="badge ok">لا توجد حصص متعذرة</div>`;
    return;
  }
  const note = fillerTotal
    ? `<div class="hint">ملاحظة: تم تعبئة ${fillerTotal} حصص بنشاط/مراجعة لتجنّب الفراغات.</div>`
    : ``;
  wrap.innerHTML = note + renderUnscheduledTable(list);
}

function renderScheduleViews(){
  $("sectionTables").innerHTML="";
  $("teacherTables").innerHTML="";
  if($("unscheduledReport")) $("unscheduledReport").innerHTML = `<div class="hint">أنشئ الجدول أولاً لعرض التقرير.</div>`;
  refreshSectionSelect();
  refreshTeacherSelect();
}

function renderSectionTable(sec){
  const {meta,grid,lens}=sec;
  const head = `<div class="row"><strong>${escapeHtml(meta.label)}</strong> <span class="badge">${meta.total} حصة</span></div>`;
  const thead = `<thead><tr><th>اليوم/الحصة</th>${Array.from({length:7},(_,i)=>`<th>${i+1}</th>`).join("")}</tr></thead>`;
  const tbody = DAYS.map((day,di)=>{
    const tds = Array.from({length:7},(_,pi)=>{
      if(pi>=lens[di]) return `<td style="background:#fff"></td>`;
      const cell = grid[di][pi];
      if(cell==="") return `<td></td>`;
      const tname = cell.teacherId
        ? (state.teachers.find(t=>t.id===cell.teacherId)?.name||"")
        : (cell.filler ? "" : "غير مسند");
      return `<td><div>${escapeHtml(cell.subject)}</div><div class="hint">${escapeHtml(tname)}</div></td>`;
    }).join("");
    return `<tr><th>${day}</th>${tds}</tr>`;
  }).join("");
  return `${head}<table>${thead}<tbody>${tbody}</tbody></table>`;
}
function renderTeacherTable(tsec){
  const {teacher,grid}=tsec;
  const lens = state.schedule?.globalLens || [7,7,7,7,7];
  const head = `<div class="row"><strong>${escapeHtml(teacher.name)} (${escapeHtml(teacher.spec)})</strong> <span class="badge">نصاب ${teacher.max}</span></div>`;
  const thead = `<thead><tr><th>اليوم/الحصة</th>${Array.from({length:7},(_,i)=>`<th>${i+1}</th>`).join("")}</tr></thead>`;
  const tbody = DAYS.map((day,di)=>{
    const tds = Array.from({length:7},(_,pi)=>{
      if(pi>=lens[di]) return `<td style="background:#fff"></td>`;
      const cell = grid[di][pi];
      if(cell==="") return `<td></td>`;
      if(cell===SUBJECTS.STANDBY) return `<td><div>${SUBJECTS.STANDBY}</div></td>`;
      return `<td><div>${escapeHtml(sectionLabel(cell))}</div></td>`;
    }).join("");
    return `<tr><th>${day}</th>${tds}</tr>`;
  }).join("");
  return `${head}<table>${thead}<tbody>${tbody}</tbody></table>`;
}
function renderUnscheduledTable(list){
  const rows = list.map(u=>{
    const tname = u.teacherId ? (state.teachers.find(t=>t.id===u.teacherId)?.name||"") : "غير مسند";
    return `<tr><td>${escapeHtml(sectionLabel(u.sectionKey))}</td><td>${escapeHtml(u.subject)}</td><td>${escapeHtml(tname)}</td></tr>`;
  }).join("");
  return `<div class="badge warn">تقرير التعذر</div>
    <table><thead><tr><th>الفصل</th><th>المادة</th><th>المعلم</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderOneSection(key){
  const wrap=$("sectionTables");
  if(!state.schedule){ wrap.innerHTML=`<div class="hint">أنشئ الجدول أولاً.</div>`; return; }
  const sec=state.schedule.sections[key];
  if(!sec){ wrap.innerHTML=`<div class="hint">لم يتم العثور على الفصل.</div>`; return; }
  wrap.innerHTML = renderSectionTable(sec);
  const uns = state.schedule.unscheduled.filter(u=>u.sectionKey===key);
  if(uns.length) wrap.innerHTML += renderUnscheduledTable(uns);
}
function renderAllSections(){
  const wrap=$("sectionTables");
  if(!state.schedule){ wrap.innerHTML=`<div class="hint">أنشئ الجدول أولاً.</div>`; return; }
  const secs=Object.values(state.schedule.sections);
  wrap.innerHTML = secs.map(s=>`<div class="schedule-block">${renderSectionTable(s)}</div>`).join("");
}
function renderOneTeacher(tid){
  const wrap=$("teacherTables");
  if(!state.schedule){ wrap.innerHTML=`<div class="hint">أنشئ الجدول أولاً.</div>`; return; }
  const tsec=state.schedule.teachers[tid];
  if(!tsec){ wrap.innerHTML=`<div class="hint">لم يتم العثور على المعلم.</div>`; return; }
  wrap.innerHTML = renderTeacherTable(tsec);
}

function renderStandbyAll(){
  const wrap = $("standbyAll");
  if(!state.schedule){ wrap.innerHTML = `<div class="hint">أنشئ الجدول أولاً.</div>`; return; }
  const ts = Object.values(state.schedule.teachers);
  // summary table
  const rows = ts.map(t=>{
    const count = t.grid.flat().filter(x=>x===SUBJECTS.STANDBY).length;
    const wanted = Number(state.standby?.[t.teacher.id]||0);
    const assigned = state.assignments?.byTeacher?.[t.teacher.id]?.items?.reduce((s,x)=>s+x.hours,0) || 0;
    return {name:t.teacher.name, spec:t.teacher.spec, max:t.teacher.max, assigned, wanted, placed:count, remaining:Math.max(0,wanted-count)};
  }).sort((a,b)=>b.placed-a.placed);
  const table = `
    <table>
      <thead><tr>
        <th>المعلم</th><th>التخصص</th><th>النصاب</th><th>المسند</th><th>الانتظار المطلوب</th><th>الانتظار المجدول</th><th>المتبقي</th>
      </tr></thead>
      <tbody>
        ${rows.map(r=>`<tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.spec)}</td>
          <td>${r.max}</td>
          <td>${r.assigned}</td>
          <td>${r.wanted}</td>
          <td>${r.placed}</td>
          <td>${r.remaining}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  // per-teacher standby slots in a clean table (avoid long vertical lists)
  const lens = state.schedule.globalLens || [7,7,7,7,7];
  const slotRows = ts.map(t=>{
    const slots=[];
    for(let di=0; di<DAYS.length; di++){
      for(let pi=0; pi<7; pi++){
        if(pi>=lens[di]) continue;
        if(t.grid[di][pi]===SUBJECTS.STANDBY) slots.push(`${DAYS[di]}-${pi+1}`);
      }
    }
    return `<tr>
      <td>${escapeHtml(t.teacher.name)}</td>
      <td>${slots.length}</td>
      <td style="text-align:right">${escapeHtml(slots.length? slots.join("، ") : "لا يوجد")}</td>
    </tr>`;
  }).join("");
  const slotsTable = `
    <table>
      <thead><tr><th>المعلم</th><th>عدد الانتظار</th><th>الأيام/الحصص</th></tr></thead>
      <tbody>${slotRows}</tbody>
    </table>`;
  wrap.innerHTML = `<div class="schedule-block"><h3>الانتظار (شامل)</h3>${table}${slotsTable}</div>`;
}

function renderAllTeachers(){
  const wrap=$("teacherTables");
  if(!state.schedule){ wrap.innerHTML=`<div class="hint">أنشئ الجدول أولاً.</div>`; return; }
  const ts=Object.values(state.schedule.teachers);
  wrap.innerHTML = ts.map(t=>`<div class="schedule-block">${renderTeacherTable(t)}</div>`).join("");
}

// Export/Import/LocalStorage

// Export/Import/LocalStorage
function exportState(){
  const payload = {
    v: 2,
    selectedStages: Array.from(state.selectedStages),
    classCounts: state.classCounts,
    teachers: state.teachers,
    standby: state.standby,
    assignments: state.assignments,
    schedule: state.schedule,
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "school-data.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  addAlert("تم تصدير البيانات (JSON).","ok");
}

function importState(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const p = JSON.parse(String(reader.result||"{}"));
      state.selectedStages = new Set(p.selectedStages||[]);
      state.classCounts = p.classCounts||{};
      state.teachers = p.teachers||[];
      state.standby = p.standby||{};
      state.assignments = p.assignments||null;
      state.schedule = p.schedule||null;

      // sync stage checkboxes
      document.querySelectorAll('#stages input[type=checkbox]').forEach(cb=>{
        cb.checked = state.selectedStages.has(cb.dataset.stage);
      });

      renderGradesConfig();
      renderTeachers();
      renderAssignmentSummary();
      renderAssignmentEditor();
      renderAllAssignmentsTable();
      renderStandbyConfig();
      renderScheduleViews();
      // عند وجود جدول محفوظ، اعرض تقرير التعذر/التعارضات فوراً
      if(state.schedule){
        renderUnscheduledReport();
      }
      addAlert("تم الاستيراد بنجاح.","ok");
    }catch(e){
      console.error(e);
      addAlert("فشل الاستيراد: الملف غير صالح.","bad");
    }
  };
  reader.readAsText(file);
}

function saveLocal(){
  const payload = {
    v: 2,
    selectedStages: Array.from(state.selectedStages),
    classCounts: state.classCounts,
    teachers: state.teachers,
    standby: state.standby,
    assignments: state.assignments,
    schedule: state.schedule,
  };
  localStorage.setItem("school_tool_state_v2", JSON.stringify(payload));
  addAlert("تم الحفظ محليًا.","ok");
}

function loadLocal(){
  const raw = localStorage.getItem("school_tool_state_v2") || localStorage.getItem("school_tool_state_v1");
  if(!raw){ addAlert("لا يوجد حفظ محلي.","warn"); return; }
  try{
    const p = JSON.parse(raw);
    state.selectedStages = new Set(p.selectedStages||[]);
    state.classCounts = p.classCounts||{};
    state.teachers = p.teachers||[];
    state.standby = p.standby||{};
    state.assignments = p.assignments||null;
    state.schedule = p.schedule||null;

    document.querySelectorAll('#stages input[type=checkbox]').forEach(cb=>{
      cb.checked = state.selectedStages.has(cb.dataset.stage);
    });

    renderGradesConfig();
    renderTeachers();
    renderAssignmentSummary();
    renderAssignmentEditor();
    renderAllAssignmentsTable();
    renderStandbyConfig();
    renderScheduleViews();
    if(state.schedule){
      renderUnscheduledReport();
    }
    addAlert("تم الاسترجاع.","ok");
  }catch(e){
    console.error(e);
    addAlert("فشل الاسترجاع.","bad");
  }
}

function clearAll(){
  if(!confirm("مسح كل البيانات؟")) return;
  state.selectedStages=new Set(); state.classCounts={}; state.teachers=[]; state.assignments=null; state.schedule=null; state.standby={};
  state.assignmentEdits={};
  localStorage.removeItem("school_tool_state_v2");
  localStorage.removeItem("school_tool_state_v1");
  document.querySelectorAll('#stages input[type=checkbox]').forEach(cb=>cb.checked=false);
  renderGradesConfig(); renderTeachers(); renderAssignmentSummary(); renderAssignmentEditor(); renderAllAssignmentsTable(); renderStandbyConfig(); renderScheduleViews();
  clearAlerts(); addAlert("تم مسح البيانات.","ok");
}

// init
function init(){
  specSelectOptions();
  renderStages();
  renderGradesConfig();
  renderTeachers();
  renderAssignmentSummary();
  renderAssignmentEditor();
  renderAllAssignmentsTable();
  renderStandbyConfig();
  refreshSectionSelect();
  refreshTeacherSelect();

  $("btnAddTeacher").onclick=()=>{
    const name=$("tName").value.trim();
    const spec=$("tSpec").value;
    const max=Number($("tRank").value);
    if(!name){ alert("أدخل اسم المعلم"); return; }
    state.teachers.push({id:uid("t_"), name, spec, max});
    $("tName").value="";
    state.assignments=null; state.schedule=null;
    renderTeachers(); renderAssignmentSummary(); renderAssignmentEditor(); renderAllAssignmentsTable(); renderStandbyConfig(); renderScheduleViews();
  };

  $("btnAssign").onclick=assignSubjects;
  $("btnBuildSchedule").onclick=buildSchedule;

  // manual assignment editing
  if($("btnRenderEdit")) $("btnRenderEdit").onclick=renderAssignmentEditor;
  if($("btnApplyEdits")) $("btnApplyEdits").onclick=applyAssignmentEdits;
  if($("editSectionSelect")) $("editSectionSelect").addEventListener("change", renderAssignmentEditor);
  if($("btnShowAllAssignments")) $("btnShowAllAssignments").onclick=()=>{
    renderAllAssignmentsTable();
    $("allAssignments").scrollIntoView({behavior:"smooth", block:"start"});
  };

  $("btnShowSection").onclick=()=>{
    const key=$("sectionSelect").value; if(!key) return;
    renderOneSection(key);
  };
  $("btnShowAllSections").onclick=()=>{
    renderAllSections();
    $("sectionTables").scrollIntoView({behavior:"smooth", block:"start"});
  };

  $("btnShowTeacher").onclick=()=>{
    const tid=$("teacherSelect").value; if(!tid) return;
    renderOneTeacher(tid);
  };
  $("btnShowAllTeachers").onclick=()=>{
    renderAllTeachers();
    $("teacherTables").scrollIntoView({behavior:"smooth", block:"start"});
  };
  $("btnShowStandbyAll").onclick=()=>{
    renderStandbyAll();
    $("standbyAll").scrollIntoView({behavior:"smooth", block:"start"});
  };


  $("btnPrint").onclick=()=>window.print();
  $("btnExport").onclick=exportState;
  $("importFile").addEventListener("change",(e)=>{
    const f=e.target.files?.[0]; if(f) importState(f);
    e.target.value="";
  });
  $("btnSave").onclick=saveLocal;
  $("btnLoad").onclick=loadLocal;
  $("btnClear").onclick=clearAll;
}

document.addEventListener("DOMContentLoaded", init);
