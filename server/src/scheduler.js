import { computeRollingAggregates } from './rollingWindow.js';

export function startScheduler() {
  console.log('🕒 Starting rolling aggregate scheduler...');
  setInterval(computeRollingAggregates, 1000);
}
