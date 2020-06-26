import { DashboardEvent } from '../../communication/dashboard-event';
import { DashboardEventManager } from '../../communication/dashboard-event-manager';

export const modelCreatedEventKey = Symbol('Model created');

/**
 * Fired after a model is created, before its properties are set and its initialization hook is run
 */
export class ModelCreatedEvent extends DashboardEvent<object> {
  public constructor(dashboardEventManager: DashboardEventManager) {
    super(dashboardEventManager, modelCreatedEventKey);
  }
}
