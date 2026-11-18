/**
 * @jest-environment jsdom
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { MetricWithAttribution } from 'web-vitals/attribution';
import * as log from '../src/log';
import * as tbt from '../src/totalBlockingTime';
import { config } from '../src/config';
import { WP } from '../src/constants';
import { initResourceTiming } from '../src/resourceTiming';
import { initPerformanceObserver } from '../src/observe';
import { initElementTiming } from '../src/element-timing';
import * as po from '../src/performanceObserver';
import mock from './_mock';

jest.mock('../src/totalBlockingTime', () => ({
  initTotalBlockingTime: jest.fn(),
}));

jest.mock('web-vitals/attribution', () => ({
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

describe('observe', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    (WP as any) = mock.performance();
    (window as any).PerformanceObserver = mock.PerformanceObserver;
    config.isResourceTiming = false;
    config.isElementTiming = false;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (spy) {
      spy.mockReset();
      spy.mockRestore();
    }
  });

  it('registers all supported web-vitals with their reporting options', () => {
    const options = { reportAllChanges: true, reportSoftNavs: true };
    config.reportOptions = {
      cls: options,
      fcp: options,
      inp: options,
      lcp: options,
      ttfb: options,
    };
    initPerformanceObserver();
    [onCLS, onFCP, onINP, onLCP, onTTFB].forEach((callback) => {
      expect(callback).toHaveBeenCalledWith(expect.any(Function), options);
    });
  });

  it('passes web-vitals metrics directly to logMetric', () => {
    const logSpy = jest.spyOn(log, 'logMetric').mockImplementation(() => {});
    initPerformanceObserver();
    const callback = jest.mocked(onLCP).mock.calls[0][0];
    const report = {
      name: 'LCP',
      value: 3000,
      rating: 'needs-improvement',
      navigationType: 'restore',
      attribution: { element: '#hero' },
    } as unknown as MetricWithAttribution;
    callback(report as Parameters<typeof callback>[0]);
    expect(logSpy).toHaveBeenCalledWith(report);
    expect(logSpy.mock.calls[0][0]).toBe(report);
    logSpy.mockRestore();
  });

  it('starts TBT reporting from FCP', () => {
    initPerformanceObserver();
    const callback = jest.mocked(onFCP).mock.calls[0][0];
    const report = {
      name: 'FCP',
      value: 100,
      rating: 'good',
      attribution: {},
    } as Parameters<typeof callback>[0];
    callback(report);
    expect(tbt.initTotalBlockingTime).toHaveBeenCalledWith(report);
  });

  describe('initPerformanceObserver()', () => {
    describe.each`
      resourceTiming | elementTiming | calls
      ${false}       | ${false}      | ${0}
      ${true}        | ${false}      | ${1}
      ${false}       | ${true}       | ${1}
      ${true}        | ${true}       | ${2}
    `(
      'when resourceTiming is $resourceTiming and elementTiming is $elementTiming',
      ({ resourceTiming, elementTiming, calls }) => {
        beforeEach(() => {
          config.isResourceTiming = resourceTiming;
          config.isElementTiming = elementTiming;

          spy = jest.spyOn(po, 'po');
          initPerformanceObserver();
        });

        it(`should call po $calls times`, () => {
          expect(spy.mock.calls.length).toEqual(calls);
        });

        it('should only call po for resource timing when is enabled', () => {
          if (config.isResourceTiming) {
            expect(spy).toHaveBeenCalledWith('resource', initResourceTiming);
          } else {
            expect(spy).not.toHaveBeenCalledWith(
              'resource',
              initResourceTiming,
            );
          }
        });

        it('should only call po for element timing when is enabled', () => {
          if (config.isElementTiming) {
            expect(spy).toHaveBeenCalledWith('element', initElementTiming);
          } else {
            expect(spy).not.toHaveBeenCalledWith('element', initElementTiming);
          }
        });
      },
    );
  });
});
