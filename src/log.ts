import { config } from './config';
import { rt } from './metrics';
import { visibility } from './onVisibilityChange';
import { reportPerf } from './reportPerf';
import { Metric } from './types';
import { roundByFour } from './utils';

export const logData = (
  measureName: string,
  metric: any,
  attribution?: object,
): void => {
  Object.keys(metric).forEach((key) => {
    if (typeof metric[key] === 'number') {
      metric[key] = roundByFour(metric[key]);
    }
  });
  // Sends the metric to an external tracking service
  reportPerf(measureName, metric, null, attribution || {});
};

/**
 * Dispatches the metric duration into internal logs
 * and the external time tracking service.
 */
export const logMetric = ({
  attribution,
  name,
  rating,
  value,
  navigationType,
  navigationId,
  navigationURL,
}: Metric): void => {
  if (name === 'FCP' && navigationType !== 'soft-navigation') {
    setTimeout(() => {
      if (!visibility.didChange) {
        logData('dataConsumption', rt.value);
      }
    }, 10000);
  }
  const duration2Decimal = roundByFour(value);
  if (duration2Decimal <= config.maxTime && duration2Decimal >= 0) {
    // Sends the metric to an external tracking service
    reportPerf(
      name,
      duration2Decimal,
      rating,
      attribution,
      navigationType,
      navigationId,
      navigationURL,
    );
  }
};
