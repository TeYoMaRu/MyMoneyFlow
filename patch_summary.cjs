const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldSummary = `window.updateSmartLoanSummary = function(){
  const borrowed=num(byId("borrowedAmount")?.value);
  const total=[...document.querySelectorAll('#smartLoanInstallments [data-smart="amount"]')].reduce((s,x)=>s+num(x.value),0);
  const cost=Math.max(0,total-borrowed);
  if(byId("loanBorrowedSummary"))byId("loanBorrowedSummary").textContent=money(borrowed);
  if(byId("loanRepaymentSummary"))byId("loanRepaymentSummary").textContent=money(total);
  if(byId("loanCostSummary"))byId("loanCostSummary").textContent=money(cost);
};`;

const newSummary = `window.updateSmartLoanSummary = function(){
  const borrowed=num(byId("borrowedAmount")?.value);
  const total=[...document.querySelectorAll('#smartLoanInstallments [data-smart="amount"]')].reduce((s,x)=>s+num(x.value),0);
  const diff = total - borrowed;
  if(byId("loanBorrowedSummary"))byId("loanBorrowedSummary").textContent=money(borrowed);
  if(byId("loanRepaymentSummary"))byId("loanRepaymentSummary").textContent=money(total);
  if(byId("loanCostSummary")){
    byId("loanCostSummary").textContent=money(Math.abs(diff));
    const parent = byId("loanCostSummary").parentElement;
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
};`;

code = code.replace(oldSummary, newSummary);
fs.writeFileSync('app.js', code);
console.log("Patched summary");
