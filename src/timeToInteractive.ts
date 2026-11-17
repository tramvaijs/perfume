export type TimingEntry = Pick<PerformanceEntry, 'startTime' | 'duration'>;

export const QUIET_WINDOW = 5000;

// TTI estimate based on CPU quietness only.
export const getTimeToInteractive = (
  longTasks: TimingEntry[],
  fcp: number,
  domContentLoaded: number,
  now: number,
): number | undefined => {
  const tasks = longTasks
    .map(({ startTime, duration }) => ({
      start: startTime,
      end: startTime + duration,
      duration,
    }))
    .filter(({ duration }) => duration > 0)
    .sort((a, b) => a.start - b.start);

  let quietStart = fcp;

  for (const task of tasks) {
    if (task.start > now) {
      break;
    }

    if (
      task.start - quietStart >= QUIET_WINDOW &&
      domContentLoaded <= task.start
    ) {
      return Math.max(quietStart, domContentLoaded);
    }

    quietStart = Math.max(quietStart, task.end);
  }

  if (
    now - quietStart >= QUIET_WINDOW &&
    domContentLoaded <= now
  ) {
    return Math.max(quietStart, domContentLoaded);
  }

  return undefined;
};