import { DashboardEventManager } from '../../../communication/dashboard-event-manager';
import { ModelScopedDashboardEvent } from '../../../communication/model-scoped-dashboard-event';
import { ModelManager } from '../../../model/manager/model-manager';
import { TimeRange } from '../time-range';

/**
 * Fired for each model when the applicable time range is changed
 */
export class TimeRangeChangedEvent extends ModelScopedDashboardEvent<TimeRange> {
  /* istanbul ignore next */
  public constructor(dashboardEventManager: DashboardEventManager, private readonly modelManager: ModelManager) {
    super(dashboardEventManager);
  }

  /**
   * Shorthand method to call `publish` for a model
   */
  public publishTimeRangeChange(model: object, newTimeRange: TimeRange): void {
    this.publish({ data: newTimeRange, source: model });
  }

  /**
   * @inheritdoc
   */
  protected modelShouldReceiveEvent(listenerModel: object, eventSourceModel: object): boolean {
    // Broadcast- all listening descendents should be notified of a change
    return eventSourceModel === listenerModel || this.modelManager.isAncestor(listenerModel, eventSourceModel);
  }
}
