import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCents,euros,inputAmount,pendingOccurrences,dueOn,shiftMonth,sumCents} from '../city/finance/finance-calculations.mjs';
import {clearFinanceState,createFinanceState} from '../city/finance/finance-state.mjs';
test('Exact EUR parsing and formatting beyond Number precision',()=>{
 assert.equal(parseCents('18,50'),'1850');assert.equal(parseCents('0.01'),'1');assert.equal(parseCents('-12,50',{signed:true}),'-1250');
 assert.equal(euros('123456'),'1.234,56\u00a0€');assert.equal(inputAmount('90071992547409931'),'900719925474099,31');
 assert.equal(sumCents(['90071992547409931','1']),'90071992547409932');
 for(const s of ['0','-1','1,234','1.234,56','1e2','NaN','Infinity','1,','12 34','10000000000000000'])assert.throws(()=>parseCents(s));
});
test('Monthly predictions clamp short months and retain skipped/confirmed/postponed decisions',()=>{
 const rule={id:'r',active:true,start_date:'2024-01-31',day_of_month:31};
 assert.equal(dueOn(rule,'2024-02-01'),'2024-02-29');assert.equal(dueOn(rule,'2025-02-01'),'2025-02-28');assert.equal(shiftMonth('2024-12-01',1),'2025-01-01');
 assert.equal(pendingOccurrences([rule],[],'2024-03-30').length,2);
 const decisions=[{rule_id:'r',period:'2024-01-01',decision:'confirmed'},{rule_id:'r',period:'2024-02-01',decision:'postponed',postponed_until:'2024-04-02'}];
 assert.equal(pendingOccurrences([rule],decisions,'2024-03-30').length,0);
 assert.equal(pendingOccurrences([rule],decisions,'2024-04-02').length,2);
 assert.equal(pendingOccurrences([{...rule,active:false}],[],'2024-04-02').length,0);
 assert.equal(pendingOccurrences([{...rule,start_date:'2024-02-29',day_of_month:1}],[],'2024-02-29').length,0);
});
test('Sign-out destroys user financial state and advances stale-request generation',()=>{
 const state=createFinanceState();Object.assign(state,{user:{id:'a'},data:{accounts:[{}]},history:[{}],busy:true,recovery:true});const old=state.generation;
 clearFinanceState(state);assert.equal(state.user,null);assert.equal(state.data,null);assert.deepEqual(state.history,[]);assert.equal(state.generation,old+1);assert.equal(state.recovery,false);
});
