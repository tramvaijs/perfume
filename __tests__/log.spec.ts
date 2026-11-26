/**
 * @jest-environment jsdom
 */
import { C, WN, WP } from '../src/constants';
import * as log from '../src/log';
import { rt } from '../src/metrics';
import { visibility } from '../src/onVisibilityChange';
import * as reportPerf from '../src/reportPerf';
import * as utils from '../src/utils';
import mock from './_mock';

jest.mock('../src/onVisibilityChange', () => {
  const originalModule = jest.requireActual('../src/onVisibilityChange');
  return {
    ...originalModule,
    visibility: {
      isHidden: false,
      didChange: false,
    },
  };
});

describe('log', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    visibility.didChange = false;
    (WN as any) = mock.navigator();
    (WP as any) = mock.performance();
    (C as any).log = (n: any) => n;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    if (spy) {
      spy.mockReset();
      spy.mockRestore();
      jest.resetAllMocks();
    }
  });

  describe('.logData()', () => {
    it('should call pushTask', () => {
      spy = jest.spyOn(utils, 'pushTask');
      log.logData('measureName', {});
      expect(spy.mock.calls.length).toEqual(1);
    });
  });

  describe('.logMetric()', () => {
    it('should call reportPerf() when value is 0', () => {
      spy = jest.spyOn(reportPerf, 'reportPerf');
      log.logMetric({
        attribution: {},
        name: 'CLS',
        rating: 'good',
        value: 0,
        navigationType: 'navigate',
      });
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(
        'CLS',
        0,
        'good',
        {},
        'navigate',
        undefined,
        undefined,
      );
    });

    it('should call reportPerf() with the correct arguments', () => {
      spy = jest.spyOn(reportPerf, 'reportPerf');
      log.logMetric({
        attribution: {},
        name: 'FCP',
        rating: 'good',
        value: 1,
        navigationType: 'navigate',
      });
      expect(spy.mock.calls.length).toEqual(1);
      expect(spy).toHaveBeenCalledWith(
        'FCP',
        1,
        'good',
        {},
        'navigate',
        undefined,
        undefined,
      );
    });

    it('should pass soft navigation attribution to reportPerf()', () => {
      spy = jest.spyOn(reportPerf, 'reportPerf');
      log.logMetric({
        attribution: {},
        name: 'CLS',
        rating: 'good',
        value: 42,
        navigationType: 'soft-navigation',
        navigationId: 3,
        navigationURL: '/product',
      });
      expect(spy).toHaveBeenCalledWith(
        'CLS',
        42,
        'good',
        {},
        'soft-navigation',
        3,
        '/product',
      );
    });

    it('should not call reportPerf() when duration is higher of config.maxTime', () => {
      spy = jest.spyOn(reportPerf, 'reportPerf');
      log.logMetric({
        attribution: {},
        name: 'FCP',
        rating: 'good',
        value: 40000,
      });
      expect(spy.mock.calls.length).toEqual(0);
    });

    it('reports data consumption after FCP without depending on TBT observation', () => {
      spy = jest.spyOn(log, 'logData');
      log.logMetric({
        name: 'FCP',
        value: 100,
        rating: 'good',
        attribution: {},
      });
      jest.advanceTimersByTime(9999);
      expect(spy).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('dataConsumption', rt.value);
    });

    it('does not report data consumption if the page was hidden', () => {
      spy = jest.spyOn(log, 'logData');
      log.logMetric({
        name: 'FCP',
        value: 100,
        rating: 'good',
        attribution: {},
      });
      visibility.didChange = true;
      jest.advanceTimersByTime(10000);
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not schedule another data consumption report for a soft navigation', () => {
      log.logMetric({
        name: 'FCP',
        value: 100,
        rating: 'good',
        attribution: {},
        navigationType: 'soft-navigation',
      });
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should report FCP for a soft navigation', () => {
      // Soft navigation values are relative to the navigation start,
      // not to the initial page load, so they pass the maxTime filter:
      // only the data consumption report is skipped, the metric is not
      spy = jest.spyOn(reportPerf, 'reportPerf');
      log.logMetric({
        attribution: {},
        name: 'FCP',
        rating: 'good',
        value: 1200,
        navigationType: 'soft-navigation',
        navigationId: 7,
        navigationURL: '/product',
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        'FCP',
        1200,
        'good',
        {},
        'soft-navigation',
        7,
        '/product',
      );
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should keep the initial load data consumption report when a soft navigation follows', () => {
      spy = jest.spyOn(log, 'logData');
      log.logMetric({
        attribution: {},
        name: 'FCP',
        rating: 'good',
        value: 100,
        navigationType: 'navigate',
      });
      log.logMetric({
        attribution: {},
        name: 'FCP',
        rating: 'good',
        value: 1200,
        navigationType: 'soft-navigation',
        navigationId: 7,
        navigationURL: '/product',
      });
      // The soft navigation must not schedule a second report
      expect(jest.getTimerCount()).toBe(1);
      jest.advanceTimersByTime(10000);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('dataConsumption', rt.value);
    });
  });
});
