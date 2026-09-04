const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Add to smartDebtTypeOptions
code = code.replace(
  '["installment","<i class=\\"ph ph-package\\"></i> ผ่อนคงที่"],',
  '["installment","<i class=\\"ph ph-package\\"></i> ผ่อนคงที่"],\n    ["smart_installment","<i class=\\"ph ph-sliders\\"></i> ผ่อนยืดหยุ่น (Smart Installment)"],'
);

// 2. Add to smartDebtFields
const smartFieldsToAdd = `
  if(type==="smart_installment"){
    return \`
      \${field("name","ชื่อรายการผ่อน","text",'required placeholder="เช่น ผ่อนทีวี"')}
      \${field("borrowedAmount","ยอดรวมที่ต้องผ่อนทั้งหมด","number",'min="0" step="0.01" required placeholder="เช่น 10000"')}
      \${field("installments","เลือกผ่อนกี่เดือน","number",'min="1" value="3" required')}
      \${field("firstDueDate","วันครบกำหนดงวดแรก","date",\`value="\${today}" required\`)}
      \${selectField("payer","ผู้จ่ายเจ้าหนี้",[["me","ฉัน"],["partner","แฟน"],["other","คนอื่น"]])}
      <div class="field full debt-form-note">
        กรอกยอดของแต่ละงวดด้านล่างได้เลย ระบบจะรวมยอดชำระให้คุณ และงวดสุดท้ายคุณสามารถปรับตัวเลขเพื่อบาลานซ์ยอดรวมทั้งหมดได้
      </div>
      <div class="field full">
        <label>ตารางผ่อนชำระแต่ละงวด</label>
        <div id="smartLoanInstallments" class="smart-installment-editor"></div>
      </div>
      <div class="loan-auto-summary field full" style="background:var(--bg-color);padding:10px;border-radius:8px;font-size:0.9rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>ยอดรวมที่ต้องผ่อนทั้งหมด</span><strong id="loanBorrowedSummary">฿0</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>ผลรวมยอดชำระแต่ละงวดที่กรอก</span><strong id="loanRepaymentSummary">฿0</strong></div>
        <div style="display:flex;justify-content:space-between;color:var(--danger);"><span>ส่วนต่าง (ควรเป็น 0)</span><strong id="loanCostSummary">฿0</strong></div>
      </div>\`;
  }
`;

code = code.replace(
  'if(type==="credit_card"){',
  smartFieldsToAdd + '\n  if(type==="credit_card"){'
);

// 3. Update renderSmartDebtForm to support smart_installment
code = code.replace(
  'if(type==="seasycash"){',
  'if(type==="seasycash" || type==="smart_installment"){'
);

// 4. Update saveCurrent to support smart_installment
const saveLogic = `
    if(t==="smart_installment"){
      const borrowed=num(d.borrowedAmount);
      const rows=[...document.querySelectorAll("#smartLoanInstallments .smart-installment-row")];
      const installments=rows.map((row,i)=>({
        no:i+1,
        amount:num(row.querySelector('[data-smart="amount"]').value),
        dueDate:row.querySelector('[data-smart="due"]').value
      }));
      const totalRepayment=installments.reduce((s,x)=>s+x.amount,0);
      
      state.debts.push({
        id:debtId,name:d.name,type:"debt",debtKind:"smart_installment",
        totalDebt:totalRepayment,remaining:totalRepayment,
        monthlyAmount:installments[0]?.amount||0,currentBill:installments[0]?.amount||0,
        installments:installments.length,paidInstallments:0,
        payer:d.payer,createdAt:todayKey()
      });
      
      installments.forEach(inst=>{
        state.payments.push({
          id:uid("pay"),debtId,name:d.name,amount:inst.amount,myShare:inst.amount,
          partnerShare:0,partnerReceived:0,dueDate:inst.dueDate,paid:false,
          type:"debt",payer:d.payer,debtKind:"smart_installment",
          installmentNo:inst.no,totalInstallments:installments.length,debtReduction:inst.amount
        });
      });
    }
`;

code = code.replace(
  'if(t==="shared_one_time"){',
  saveLogic + '\n    if(t==="shared_one_time"){'
);

// 5. Update debtKindLabel
code = code.replace(
  'return({credit_card:"บัตรเครดิต",installment:"ผ่อนคงที่",loan:"สินเชื่อ",statement:"ใบแจ้งหนี้"})[k]||"หนี้";',
  'return({credit_card:"บัตรเครดิต",installment:"ผ่อนคงที่",smart_installment:"ผ่อนยืดหยุ่น",loan:"สินเชื่อ",statement:"ใบแจ้งหนี้"})[k]||"หนี้";'
);

fs.writeFileSync('app.js', code);
console.log("Patched smart_installment");
