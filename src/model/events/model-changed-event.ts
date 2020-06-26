import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { ModelScopedDashboardEvent } from '../../communication/model-scoped-dashboard-event';
import { ModelManager } from '../manager/model-manager';

/**
 * Fired after a property of a model (or a child model) changes.
 */
export class ModelChangedEvent extends ModelScopedDashboardEvent<object> {
  /* istanbul ignore next */
  public constructor(dashboardEventManager: DashboardEventManager, private readonly modelManager: ModelManager) {
    super(dashboardEventManager);
  }

  /**
   * Shorthand method to call `publish` for a model
   */
  public publishChange(model: object): void {
    this.publish({ data: model, source: model });
  }

  /**
   * @inheritdoc
   */
  protected modelShouldReceiveEvent(listenerModel: object, eventSourceModel: object): boolean {
    // Bubble up - all listening ancestors should be notified of a change
    return eventSourceModel === listenerModel || this.modelManager.isAncestor(eventSourceModel, listenerModel);
  }
}
