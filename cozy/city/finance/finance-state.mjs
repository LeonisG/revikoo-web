import { todayISO, monthOf } from './finance-calculations.mjs';
export function createFinanceState() {
  return { user: null, data: null, history: [], month: monthOf(todayISO()), view: 'welcome', busy: false, error: '', notice: '', recovery: false, generation: 0 };
}
export function clearFinanceState(state) {
  Object.assign(state, createFinanceState(), { generation: state.generation+1 });
}
