import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} from 'web-vitals/attribution';

import { config } from './config';
import { initElementTiming } from './element-timing';
import { logMetric } from './log';
import { po } from './performanceObserver';
import { initResourceTiming } from './resourceTiming';
import { initTotalBlockingTime } from './totalBlockingTime';

export const initPerformanceObserver = (): void => {
  onTTFB((report) => {
    if (report.value > 0) {
      logMetric(report);
    }
  }, config.reportOptions.ttfb);
  onCLS(logMetric, config.reportOptions.cls);
  onFCP((report) => {
    logMetric(report);
    initTotalBlockingTime(report);
  }, config.reportOptions.fcp);
  onLCP(logMetric, config.reportOptions.lcp);
  onINP(logMetric, config.reportOptions.inp);

  if (config.isResourceTiming) {
    po('resource', initResourceTiming);
  }
  if (config.isElementTiming) {
    po('element', initElementTiming);
  }
};

export const disconnectPerfObserversHidden = (): void => {
  // TODO: Use if need it
};
