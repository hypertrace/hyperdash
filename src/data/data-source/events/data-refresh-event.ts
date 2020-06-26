import { DashboardEventManager } from '../../../communication/dashboard-event-manager';
import { ModelScopedDashboardEvent } from '../../../communication/model-scoped-dashboard-event';
import { ModelManager } from '../../../model/manager/model-manager';

export const dataRefreshEventKey = Symbol('Data refresh');

/**
 * Fired for each model when a refresh is requested
 */
export class DataRefreshEvent extends ModelScopedDashboardEvent {
  /* istanbul ignore next */
  public constructor(dashboardEventManager: DashboardEventManager, private readonly modelManager: ModelManager) {
    super(dashboardEventManager);
  }

  /**
   * Shorthand method to call `publish` for a model
   */
  public publishRefresh(model: object): void {
    this.publish({ data: undefined, source: model });
  }

  /**
   * @inheritdoc
   */
  protected modelShouldReceiveEvent(listenerModel: object, eventSourceModel: object): boolean {
    // Broadcast- all listening descendents should be notified of a change
    return eventSourceModel === listenerModel || this.modelManager.isAncestor(listenerModel, eventSourceModel);
  }
}
