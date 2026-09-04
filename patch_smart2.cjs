const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Replace smart_installment in smartDebtFields
const oldSmartFields = /if\(type==="smart_installment"\)\{[\s\S]*?\}\s*(?=if\(type==="credit_card"\))/;
const newSmartFields = `
  if(type==="smart_installment"){
    return \`
      \${field("name","ชื่อรายการผ่อน","text",'required placeholder="เช่น ผ่อนทีวี"')}
      \${field("borrowedAmount","ยอดรวมทั้งหมดตั้งแต่แรก","number",'min="0" step="0.01" required')}
      \${field("alreadyPaidAmount","ยอดที่จ่ายไปแล้ว (ถ้ายอดยกมา)","number",'min="0" step="0.01" value="0"')}
      \${field("installments","จำนวนงวดทั้งหมด","number",'min="1" value="3" required')}
      \${field("paidInstallments","จ่ายไปแล้วกี่งวด","number",'min="0" value="0" required')}
      \${field("firstDueDate","วันครบกำหนดงวดถัดไป","date",\`value="\${today}" required\`)}
      \${selectField("payer","ผู้จ่ายเจ้าหนี้",[["me","ฉัน"],["partner","แฟน"],["other","คนอื่น"]])}
      <div class="field full debt-form-note">
        ระบบจะสร้างตารางเฉพาะ "งวดที่เหลือ" เท่านั้น กรอกยอดชำระของแต่ละงวดด้านล่างได้เลย ระบบจะรวมยอดชำระให้คุณ และงวดสุดท้ายสามารถปรับตัวเลขเพื่อบาลานซ์ยอดให้ตรงกันได้
      </div>
      <div class="field full">
        <label>ตารางผ่อนชำระแต่ละงวด</label>
        <div id="smartLoanInstallments" class="smart-installment-editor"></div>
      </div>
      <div class="loan-auto-summary field full" style="background:var(--bg-color);padding:10px;border-radius:8px;font-size:0.9rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>ยอดหนี้ที่เหลือต้องจัดสรร</span><strong id="loanBorrowedSummary">฿0</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>ผลรวมยอดชำระในตาราง</span><strong id="loanRepaymentSummary">฿0</strong></div>
        <div style="display:flex;justify-content:space-between;color:var(--danger);"><span>ส่วนต่าง (ควรเป็น 0)</span><strong id="loanCostSummary">฿0</strong></div>
      </div>\`;
  }
`;
code = code.replace(oldSmartFields, newSmartFields);

// 2. Replace updateSmartLoanSummary
const oldSummary = /window\.updateSmartLoanSummary = function\(\)\{[\s\S]*?\};/;
const newSummary = `
window.updateSmartLoanSummary = function(){
  const isSmartInst = byId("debtEntryType")?.value === "smart_installment";
  const borrowed=num(byId("borrowedAmount")?.value);
  const alreadyPaid=num(byId("alreadyPaidAmount")?.value);
  const total=[...document.querySelectorAll('#smartLoanInstallments [data-smart="amount"]')].reduce((s,x)=>s+num(x.value),0);
  
  if(isSmartInst) {
    const remainingTarget = Math.max(0, borrowed - alreadyPaid);
    const diff = total - remainingTarget;
    if(byId("loanBorrowedSummary")) {
        byId("loanBorrowedSummary").previousElementSibling.textContent = "ยอดหนี้ที่เหลือต้องจัดสรร";
        byId("loanBorrowedSummary").textContent=money(remainingTarget);
    }
    if(byId("loanRepaymentSummary")) {
        byId("loanRepaymentSummary").previousElementSibling.textContent = "ผลรวมยอดชำระในตาราง";
        byId("loanRepaymentSummary").textContent=money(total);
    }
    if(byId("loanCostSummary")){
      const parent = byId("loanCostSummary").parentElement;
      parent.firstElementChild.textContent = "ส่วนต่าง (ควรเป็น 0)";
      if(diff === 0) {
        parent.style.color = "var(--success)";
        byId("loanCostSummary").textContent = "ครบพอดี (฿0)";
      } else if(diff > 0) {
        parent.style.color = "var(--danger)";
        byId("loanCostSummary").textContent = "+" + money(diff);
      } else {
        parent.style.color = "var(--danger)";
        byId("loanCostSummary").textContent = "-" + money(Math.abs(diff));
      }
    }
  } else {
    // SEasyCash
    const cost=Math.max(0,total-borrowed);
    if(byId("loanBorrowedSummary")) {
        byId("loanBorrowedSummary").previousElementSibling.textContent = "เงินที่ได้รับ";
        byId("loanBorrowedSummary").textContent=money(borrowed);
    }
    if(byId("loanRepaymentSummary")) {
        byId("loanRepaymentSummary").previousElementSibling.textContent = "ยอดชำระรวม";
        byId("loanRepaymentSummary").textContent=money(total);
    }
    if(byId("loanCostSummary")){
      const parent = byId("loanCostSummary").parentElement;
      parent.firstElementChild.textContent = "ดอกเบี้ย/ต้นทุนรวมโดยประมาณ";
      parent.style.color = "var(--danger)";
      byId("loanCostSummary").textContent=money(cost);
    }
  }
};
`.trim();
code = code.replace(oldSummary, newSummary);

// 3. Replace renderSmartLoanInstallments
const oldRenderInst = /function renderSmartLoanInstallments\(preserve=true\)\{[\s\S]*?\}\n/m;
const newRenderInst = `
function renderSmartLoanInstallments(preserve=true){
  const box=byId("smartLoanInstallments");
  if(!box)return;
  const isSmartInst = byId("debtEntryType")?.value === "smart_installment";
  const totalInst=Math.max(1,parseInt(byId("installments")?.value||"1",10));
  const paidInst=isSmartInst ? parseInt(byId("paidInstallments")?.value||"0",10) : 0;
  const count=Math.max(1, totalInst - paidInst);
  const first=byId("firstDueDate")?.value||todayKey();
  const old=[];
  if(preserve){
    box.querySelectorAll(".smart-installment-row").forEach(row=>{
      old.push({
        amount:row.querySelector('[data-smart="amount"]')?.value||"",
        due:row.querySelector('[data-smart="due"]')?.value||""
      });
    });
  }
  box.innerHTML=Array.from({length:count},(_,i)=>{
    const amount=old[i]?.amount || "";
    const due=old[i]?.due || makeMonthlyDate(first,i);
    return \`<div class="smart-installment-row">
      <strong>งวด \${paidInst+i+1}/\${totalInst}</strong>
      <label>ยอดชำระ<input data-smart="amount" type="number" min="0" step="0.01" value="\${amount}" required></label>
      <label>วันครบกำหนด<input data-smart="due" type="date" value="\${due}" required></label>
    </div>\`;
  }).join("");
  box.querySelectorAll('[data-smart="amount"]').forEach(el=>el.addEventListener('input', window.updateSmartLoanSummary));
  if(typeof window.updateSmartLoanSummary === 'function') window.updateSmartLoanSummary();
}
`;
code = code.replace(oldRenderInst, newRenderInst);

// 4. Replace renderSmartDebtForm
const oldRenderForm = /function renderSmartDebtForm\(type\)\{[\s\S]*?\}\n/m;
const newRenderForm = `
function renderSmartDebtForm(type){
  const dynamic=byId("smartDebtDynamic");
  if(!dynamic)return;
  dynamic.innerHTML=smartDebtFields(type,todayKey());
  if(type==="seasycash" || type==="smart_installment"){
    renderSmartLoanInstallments(false);
    ["installments","paidInstallments","firstDueDate"].forEach(id=>byId(id)?.addEventListener("change",()=>renderSmartLoanInstallments(true)));
    ["borrowedAmount","alreadyPaidAmount"].forEach(id=>byId(id)?.addEventListener("input", window.updateSmartLoanSummary));
    if(typeof window.updateSmartLoanSummary === 'function') window.updateSmartLoanSummary();
  }
}
`;
code = code.replace(oldRenderForm, newRenderForm);

// 5. Replace saveCurrent logic for smart_installment
const oldSaveLogic = /if\(t==="smart_installment"\)\{[\s\S]*?\}\s*(?=if\(t==="shared_one_time"\))/;
const newSaveLogic = `
    if(t==="smart_installment"){
      const borrowed=num(d.borrowedAmount);
      const alreadyPaid=num(d.alreadyPaidAmount);
      const totalInst=Math.max(1,num(d.installments));
      const paidInst=Math.max(0,num(d.paidInstallments));
      
      const rows=[...document.querySelectorAll("#smartLoanInstallments .smart-installment-row")];
      const installments=rows.map((row,i)=>({
        no: paidInst + i + 1,
        amount:num(row.querySelector('[data-smart="amount"]').value),
        dueDate:row.querySelector('[data-smart="due"]').value
      }));
      const remainingRepayment=installments.reduce((s,x)=>s+x.amount,0);
      const totalDebt = alreadyPaid + remainingRepayment;
      
      state.debts.push({
        id:debtId,name:d.name,type:"debt",debtKind:"smart_installment",
        totalDebt:totalDebt,remaining:remainingRepayment,
        monthlyAmount:installments[0]?.amount||0,currentBill:installments[0]?.amount||0,
        installments:totalInst,paidInstallments:paidInst,
        payer:d.payer,createdAt:todayKey()
      });
      
      installments.forEach(inst=>{
        state.payments.push({
          id:uid("pay"),debtId,name:d.name,amount:inst.amount,myShare:inst.amount,
          partnerShare:0,partnerReceived:0,dueDate:inst.dueDate,paid:false,
          type:"debt",payer:d.payer,debtKind:"smart_installment",
          installmentNo:inst.no,totalInstallments:totalInst,debtReduction:inst.amount
        });
      });
    }
`;
code = code.replace(oldSaveLogic, newSaveLogic);

fs.writeFileSync('app.js', code);
console.log("Patched smart2");
