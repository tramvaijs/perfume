import { getTimeToInteractive } from '../src/timeToInteractive';

const task = (startTime: number, end: number) => ({
  startTime,
  duration: end - startTime,
});

describe('getTimeToInteractive', () => {
  it('requires five seconds of quiet after FCP', () => {
    expect(getTimeToInteractive([], 100, 200, 5099)).toBeUndefined();
    expect(getTimeToInteractive([], 100, 200, 5100)).toBe(200);
  });

  it('uses the end of the last long task, without adding the quiet window to TTI', () => {
    expect(
      getTimeToInteractive([task(500, 750)], 100, 200, 5749),
    ).toBeUndefined();
    expect(getTimeToInteractive([task(500, 750)], 100, 200, 5750)).toBe(
      750,
    );
  });

  it('finds the first overlapping quiet window even when initialized late', () => {
    const tasks = [task(500, 750), task(7000, 7300)];
    expect(getTimeToInteractive(tasks, 100, 200, 13000)).toBe(750);
  });
});
