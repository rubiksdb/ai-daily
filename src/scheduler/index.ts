import cron from 'node-cron';
import { pollAll } from '../poller/index.js';
import { summarizePeriod } from '../summarizer/summarize.js';

export function startScheduler() {
  const pollCron = process.env.POLL_CRON ?? '0 6 * * *';

  // Daily poll at 06:00
  cron.schedule(pollCron, async () => {
    console.log('[scheduler] Starting daily poll...');
    await pollAll();
  });

  // Daily summary at 07:00
  cron.schedule('0 7 * * *', async () => {
    console.log('[scheduler] Generating daily summary...');
    await summarizePeriod('daily');
  });

  // Weekly summary every Monday at 07:00
  cron.schedule('0 7 * * 1', async () => {
    console.log('[scheduler] Generating weekly summary...');
    await summarizePeriod('weekly');
  });

  // Monthly summary on the 1st at 07:00
  cron.schedule('0 7 1 * *', async () => {
    console.log('[scheduler] Generating monthly summary...');
    await summarizePeriod('monthly');
  });

  console.log(`Scheduler started. Poll cron: "${pollCron}"`);
}
