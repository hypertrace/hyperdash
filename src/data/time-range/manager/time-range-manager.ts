import { ModelManager } from '../../../model/manager/model-manager';
import { TimeRangeChangedEvent } from '../events/time-range-changed-event';
import { TimeRange } from '../time-range';

/**
 * Manages time ranges and their associations with specific models
 */
export class TimeRangeManager {
  public constructor(
    private readonly modelManager: ModelManager,
    private readonly timeRangeChangedEvent: TimeRangeChangedEvent
  ) {}

  private readonly rootTimeRangeByModelRoot: WeakMap<object, TimeRange> = new WeakMap();

  /**
   * Sets the root time range for the provided model tree.
   */
  public setRootTimeRange(rootModel: object, timeRange: TimeRange): void {
    this.rootTimeRangeByModelRoot.set(rootModel, timeRange);
    this.timeRangeChangedEvent.publishTimeRangeChange(rootModel, timeRange);
  }

  // TODO - setting time range for child models, serialization/deserialization, relative TRs
  /**
   * Retrieves the time range attached to the closest model in the tree to the provided model,
   * searching upwards.
   */
  public getClosest(modelInstance: object): TimeRange | undefined {
    return this.rootTimeRangeByModelRoot.get(this.modelManager.getRoot(modelInstance));
  }
}
