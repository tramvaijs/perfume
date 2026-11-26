import { config } from './config';
import { getNavigatorInfo } from './getNavigatorInfo';
import { visibility } from './onVisibilityChange';
import { IVitalsScore, INavigationType } from './types';
import { pushTask } from './utils';

/**
 * Metrics that web-vitals finalizes when the page becomes hidden or
 * closed. They have to be sent to the tracker synchronously: a task
 * deferred via requestIdleCallback may never run on a hidden page.
 */
const IMMEDIATE_METRICS = ['CLS', 'INP', 'LCP'];

/**
 * Sends the User timing measure to analyticsTracker
 */
export const reportPerf = (
  measureName: string,
  data: any,
  rating: IVitalsScore,
  attribution: object,
  navigationType?: INavigationType,
  navigationId?: number,
  navigationURL?: string,
): void => {
  const reportTask = () => {
    if (!config.analyticsTracker) {
      return;
    }
    // Doesn't send timing when page is hidden, except for the metrics
    // that web-vitals finalizes at that moment
    if (visibility.isHidden && !IMMEDIATE_METRICS.includes(measureName)) {
      return;
    }
    // Send metric to custom Analytics service
    config.analyticsTracker({
      attribution,
      metricName: measureName,
      data,
      navigatorInformation: getNavigatorInfo(),
      rating,
      navigationType,
      navigationId,
      navigationURL,
    });
  };

  // Send metrics finalized on page hide or close immediately,
  // because they may be the last value this page ever reports
  if (IMMEDIATE_METRICS.includes(measureName)) {
    reportTask();
  } else {
    pushTask(reportTask);
  }
};
