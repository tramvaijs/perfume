/**
 * @jest-environment jsdom
 */
import type { FCPMetricWithAttribution } from 'web-vitals/attribution';
import { WP } from '../src/constants';
import * as log from '../src/log';
import { fcp, tbt, ntbt } from '../src/metrics';
import { perfObservers } from '../src/observeInstances';
import { visibility } from '../src/onVisibilityChange';
import * as observers from '../src/performanceObserver';
import mock from './_mock';
import {
  calculateTotalBlockingTime,
  initTotalBlockingTime,
} from '../src/totalBlockingTime';

const report = {
  name: 'FCP',
  value: 100,
  entries: [{ startTime: 100 }],
  attribution: {},
  navigationType: 'navigate',
} as FCPMetricWithAttribution;

const entry = (startTime: number, duration: number) => ({
  startTime,
  duration,
});

describe('calculateTotalBlockingTime', () => {
  it.each([
    [[], 0, 0],
    [[{ start: 100, end: 150 }], 0, 0],
    [
      [
        { start: 100, end: 160 },
        { start: 200, end: 280 },
      ],
      40,
      2,
    ],
    [
      [
        { start: 0, end: 90 },
        { start: 1100, end: 1300 },
      ],
      0,
      0,
    ],
    // Clip each task to FCP/TTI before subtracting 50ms, like Lighthouse.
    [[{ start: 0, end: 180 }], 30, 1],
    [[{ start: 950, end: 1200 }], 0, 0],
    [[{ start: 900, end: 1200 }], 50, 1],
  ])(
    'sums only blocking time inside the measurement window (%j)',
    (tasks, expectedTbt, expectedCount) => {
      expect(
        calculateTotalBlockingTime(
          tasks.map(({ start, end }) => entry(start, end - start)),
          100,
          1000,
        ),
      ).toEqual({
        totalBlockingTime: expectedTbt,
        longTaskCount: expectedCount,
      });
    },
  );

  it('returns zero for an empty measurement window', () => {
    expect(calculateTotalBlockingTime([entry(0, 200)], 100, 100)).toEqual({
      totalBlockingTime: 0,
      longTaskCount: 0,
    });
  });
});

describe('TBT reporting', () => {
  let now: number;
  let takeRecords: jest.Mock;
  let recordLongTasks: (entries: ReturnType<typeof entry>[]) => void;
  let reportSpy: jest.SpyInstance;
  let observerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 100;
    (WP as any) = mock.performance();
    jest.spyOn(WP, 'now').mockImplementation(() => now);
    jest
      .spyOn(WP, 'getEntriesByType')
      .mockImplementation((type) =>
        type === 'navigation'
          ? ([
              { domContentLoadedEventEnd: 200 },
            ] as PerformanceNavigationTiming[])
          : [],
      );
    jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    jest.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    visibility.didChange = false;
    visibility.isHidden = false;
    delete perfObservers[0];
    fcp.value = 0;
    tbt.value = 0;
    ntbt.value = 0;
    takeRecords = jest.fn(() => []);
    observerSpy = jest
      .spyOn(observers, 'po')
      .mockImplementation((type, callback) => {
        if (type === 'longtask') {
          recordLongTasks = callback;
          return {
            takeRecords,
            disconnect: jest.fn(),
          } as unknown as PerformanceObserver;
        }
        return {
          takeRecords: () => [],
        } as unknown as PerformanceObserver;
      });
    reportSpy = jest.spyOn(log, 'logMetric').mockImplementation(() => {});
  });

  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete perfObservers[0];
  });

  const advance = (duration: number) => {
    now += duration;
    jest.advanceTimersByTime(duration);
  };

  it('reports without user input and includes buffered tasks crossing FCP', () => {
    initTotalBlockingTime(report);
    recordLongTasks([entry(50, 150), entry(300, 100)]);
    advance(5000);
    expect(reportSpy).not.toHaveBeenCalled();
    advance(1000);
    expect(reportSpy).toHaveBeenCalledWith({
      name: 'TBT',
      value: 100,
      rating: 'good',
      navigationType: 'navigate',
      attribution: {
        longTaskCount: 2,
      },
    });
  });

  it('reports zero once on an idle page and ignores repeated FCP reports', () => {
    initTotalBlockingTime(report);
    initTotalBlockingTime(report);
    advance(5000);
    expect(reportSpy).toHaveBeenCalledTimes(1);
    expect(tbt.value).toBe(0);
    advance(10000);
    expect(reportSpy).toHaveBeenCalledTimes(1);
  });

  it('drains queued observer records before deciding the page is interactive', () => {
    initTotalBlockingTime(report);
    takeRecords.mockReturnValueOnce([entry(4900, 100)]);
    advance(5000);
    expect(reportSpy).not.toHaveBeenCalled();
    advance(5000);
    expect(reportSpy).toHaveBeenCalledWith(
      expect.objectContaining({ value: 50 }),
    );
  });

  it('continues collecting NTBT after TBT has been finalized', () => {
    initTotalBlockingTime(report);
    advance(5000);
    ntbt.value = 0;
    recordLongTasks([entry(6000, 80)]);
    expect(ntbt.value).toBe(30);
    expect(tbt.value).toBe(0);
  });

  it('creates observer only once', () => {
    initTotalBlockingTime(report);
    initTotalBlockingTime(report);
    expect(observerSpy.mock.calls[0][0]).toEqual('longtask');
  });

  it('skips unsupported longtask observation without scheduling timers', () => {
    observerSpy.mockReturnValue(null);
    initTotalBlockingTime(report);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['back-forward-cache', 'soft-navigation'] as const)(
    'does not reuse initial-load entries for %s',
    (navigationType) => {
      initTotalBlockingTime({ ...report, navigationType });
      expect(observerSpy).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('keeps measuring initial-load TBT when a soft navigation follows', () => {
    initTotalBlockingTime(report);
    recordLongTasks([entry(300, 100)]);

    // A soft navigation to another route must not disturb the
    // ongoing initial-load TBT measurement
    initTotalBlockingTime({
      ...report,
      navigationType: 'soft-navigation',
      navigationURL: '/product',
    } as FCPMetricWithAttribution);

    expect(observerSpy).toHaveBeenCalledTimes(1);
    advance(5000);
    expect(reportSpy).not.toHaveBeenCalled();
    advance(1000);
    expect(reportSpy).toHaveBeenCalledWith({
      name: 'TBT',
      value: 50,
      rating: 'good',
      navigationType: 'navigate',
      attribution: {
        longTaskCount: 1,
      },
    });
  });
});
