/**
 * @jest-environment jsdom
 */
import { config } from '../src/config';
import { W, WN, WP } from '../src/constants';
import { visibility } from '../src/onVisibilityChange';
import { reportPerf } from '../src/reportPerf';
import mock from './_mock';

describe('reportPerf', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    visibility.isHidden = false;
    (WN as any) = mock.navigator();
    (WP as any) = mock.performance();
  });

  describe('reportPerf()', () => {
    it('should not call analyticsTracker() if isHidden is true', () => {
      visibility.isHidden = true;
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('FCP', 0.01, 'good', {});
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('should not call analyticsTracker() if isHidden is true and measureName is CLS', () => {
      visibility.isHidden = true;
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('CLS', 123, 'good', {});
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'CLS',
        data: 123,
        attribution: {},
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
      });
    });

    it('should not call analyticsTracker() if isHidden is true and measureName is INP', () => {
      visibility.isHidden = true;
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('INP', 123, 'good', {});
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'INP',
        data: 123,
        attribution: {},
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
      });
    });

    it('should call analyticsTracker() if isHidden is true and measureName is LCP', () => {
      // web-vitals finalizes LCP when the page becomes hidden,
      // the final value must not be dropped
      visibility.isHidden = true;
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('LCP', 123, 'good', {});
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'LCP',
        data: 123,
        attribution: {},
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
      });
    });

    it('should pass navigationId and navigationURL to analyticsTracker()', () => {
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf(
        'CLS',
        123,
        'good',
        {},
        'soft-navigation',
        3,
        '/product',
      );
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'CLS',
        data: 123,
        attribution: {},
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
        navigationType: 'soft-navigation',
        navigationId: 3,
        navigationURL: '/product',
      });
    });

    it('should report soft navigation CLS, INP and LCP finalized while the page is hidden', () => {
      // After a /catalog -> /product soft navigation, the previous route's
      // metrics can be finalized by the tab becoming hidden: they must
      // still reach the tracker, tagged with the route they belong to
      visibility.isHidden = true;
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');

      reportPerf('CLS', 0.12, 'good', {}, 'soft-navigation', 2, '/catalog');
      reportPerf('INP', 250, 'good', {}, 'soft-navigation', 2, '/catalog');
      reportPerf(
        'LCP',
        2100,
        'needs-improvement',
        {},
        'soft-navigation',
        2,
        '/catalog',
      );

      expect(spy.mock.calls.length).toEqual(3);
      ['CLS', 'INP', 'LCP'].forEach((metricName, index) => {
        expect(spy.mock.calls[index][0]).toEqual(
          expect.objectContaining({
            metricName,
            navigationType: 'soft-navigation',
            navigationId: 2,
            navigationURL: '/catalog',
          }),
        );
      });
    });

    it('should defer a soft navigation FCP report until the browser is idle', () => {
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');

      // emulate requestIdleCallback delay
      const tasks: Function[] = [];
      (W as any).requestIdleCallback = (cb: Function) => tasks.push(cb);

      reportPerf('FCP', 1200, 'good', {}, 'soft-navigation', 7, '/product');
      expect(spy).not.toHaveBeenCalled();

      // run requestIdleCallback tasks
      tasks.forEach(task => task());
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'FCP',
          data: 1200,
          navigationType: 'soft-navigation',
          navigationId: 7,
          navigationURL: '/product',
        }),
      );

      // restore the default synchronous pushTask fallback
      delete (W as any).requestIdleCallback;
    });

    it('should call analyticsTracker() if analyticsTracker is defined', () => {
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('FCP', 123, 'good', {});
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'FCP',
        data: 123,
        attribution: {},
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
      });
    });

    it('should call analyticsTracker() with customProperties', () => {
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');
      reportPerf('TBT', 423, 'needs-improvement', { mare: 'sea' });
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith({
        metricName: 'TBT',
        data: 423,
        attribution: { mare: 'sea' },
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'needs-improvement',
      });
    });

    it('CLS, INP and LCP should be reported immediately without requestIdleCallback', () => {
      config.analyticsTracker = () => {};
      spy = jest.spyOn(config, 'analyticsTracker');

      // emulate requestIdleCallback delay
      const tasks: Function[] = [];
      (W as any).requestIdleCallback = (cb: Function) => tasks.push(cb);

      const immediatelyReportedMetrics = ['CLS', 'INP', 'LCP'];
      const delayedMetrics = ['TTFB', 'FCP', 'TBT'];
      const defaultData = {
        data: 123,
        attribution: {},
        navigationType: undefined,
        navigatorInformation: {
          deviceMemory: 8,
          hardwareConcurrency: 12,
          isLowEndDevice: false,
          isLowEndExperience: false,
          serviceWorkerStatus: 'unsupported',
        },
        rating: 'good',
      };

      [...immediatelyReportedMetrics, ...delayedMetrics].forEach(metric => {
        reportPerf(metric, 123, 'good', {});
      });

      expect(spy.mock.calls).toEqual(
        immediatelyReportedMetrics.map(metric => [
          {
            metricName: metric,
            ...defaultData,
          },
        ]),
      );

      // run requestIdleCallback tasks
      tasks.forEach(task => task());

      expect(spy.mock.calls).toEqual(
        [...immediatelyReportedMetrics, ...delayedMetrics].map(metric => [
          {
            metricName: metric,
            ...defaultData,
          },
        ]),
      );
    });
  });
});
