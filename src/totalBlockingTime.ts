import type { FCPMetricWithAttribution } from 'web-vitals/attribution';

import { W, WP } from './constants';
import { logMetric } from './log';
import { fcp, tbt, ntbt, tti } from './metrics';
import { perfObservers } from './observeInstances';
import { visibility } from './onVisibilityChange';
import { po } from './performanceObserver';
import {
  getTimeToInteractive,
  QUIET_WINDOW,
  TimingEntry,
} from './timeToInteractive';
import { getVitalsScore } from './vitalsScore';

export const calculateTotalBlockingTime = (
  tasks: TimingEntry[],
  start: number,
  end: number,
): number => {
  let total = 0;

  for (const task of tasks) {
    const clippedStart = Math.max(task.startTime, start);
    const clippedEnd = Math.min(task.startTime + task.duration, end);
    total += Math.max(0, clippedEnd - clippedStart - 50);
  }

  return total;
};

export const initTotalBlockingTime = (
  report: FCPMetricWithAttribution,
): void => {
  const supportedTypes = W.PerformanceObserver?.supportedEntryTypes;

  if (
    perfObservers[0] ||
    report.navigationType === 'back-forward-cache' ||
    report.navigationType === 'soft-navigation' ||
    (supportedTypes && !supportedTypes.includes('longtask'))
  ) {
    return;
  }

  const longTasks: TimingEntry[] = [];

  fcp.value = report.entries[0]?.startTime ?? report.value;
  let collecting = true;

  const recordLongTasks = (entries: TimingEntry[]) => {
    entries.forEach((entry) => {
      if (entry.duration >= 50) {
        if (collecting) {
          longTasks.push(entry);
        }

        if (entry.startTime >= fcp.value) {
          ntbt.value += entry.duration - 50;
        }
      }
    });
  };

  const longTasksObserver = po('longtask', recordLongTasks);
  if (!longTasksObserver) {
    return;
  }

  perfObservers[0] = longTasksObserver;
  let timer: number;

  const stop = () => {
    W.clearTimeout(timer);
    collecting = false;
    longTasks.length = 0;
    document.removeEventListener('visibilitychange', onHidden);
    W.removeEventListener('pagehide', stop);
  };

  const onHidden = () => {
    if (document.hidden) {
      stop();
    }
  };

  const check = () => {
    if (visibility.didChange || document.hidden) {
      stop();
      return;
    }

    recordLongTasks(longTasksObserver.takeRecords());

    const domContentLoaded =
      WP.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd;

    tti.value = domContentLoaded
      ? getTimeToInteractive(longTasks, fcp.value, domContentLoaded, WP.now())
      : undefined;

    if (tti.value === undefined) {
      timer = W.setTimeout(check, 1000);
      return;
    }

    tbt.value = calculateTotalBlockingTime(longTasks, fcp.value, tti.value);
    stop();

    logMetric({
      name: 'TBT',
      value: tbt.value,
      rating: getVitalsScore('TBT', tbt.value),
      attribution: {
        firstContentfulPaint: fcp.value,
        timeToInteractive: tti.value,
      },
      navigationType: report.navigationType,
    });
  };

  document.addEventListener('visibilitychange', onHidden);
  W.addEventListener('pagehide', stop);
  timer = W.setTimeout(check, QUIET_WINDOW);
};
