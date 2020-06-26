import { ModelManager } from '../../../model/manager/model-manager';
import { TimeRangeChangedEvent } from '../events/time-range-changed-event';
import { TimeRangeManager } from './time-range-manager';

describe('Data source manager', () => {
  let timeRangeManager: TimeRangeManager;
  let mockModelManager: Partial<ModelManager>;
  let mockTimeRangeChangeEvent: Partial<TimeRangeChangedEvent>;

  const mockModel = {};
  const mockRoot = {};
  const timeRange = { startTime: new Date(), endTime: new Date() };

  beforeEach(() => {
    mockModelManager = {
      getRoot: jest.fn(() => mockRoot)
    };
    mockTimeRangeChangeEvent = {
      publishTimeRangeChange: jest.fn()
    };

    timeRangeManager = new TimeRangeManager(
      mockModelManager as ModelManager,
      mockTimeRangeChangeEvent as TimeRangeChangedEvent
    );
  });

  test('supports setting and looking up time ranges', () => {
    timeRangeManager.setRootTimeRange(mockRoot, timeRange);

    expect(timeRangeManager.getClosest(mockModel)).toBe(timeRange);
    expect(timeRangeManager.getClosest(mockRoot)).toBe(timeRange);
  });

  test('publishes time range change when time range updated', () => {
    timeRangeManager.setRootTimeRange(mockRoot, timeRange);
    expect(mockTimeRangeChangeEvent.publishTimeRangeChange).toHaveBeenCalledWith(mockRoot, timeRange);
  });
});
