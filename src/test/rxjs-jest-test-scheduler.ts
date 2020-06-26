import { TestScheduler } from 'rxjs/testing';

export const getTestScheduler = () =>
  new TestScheduler((actual: unknown, expected: unknown) => {
    expect(actual).toEqual(expected);
  });
