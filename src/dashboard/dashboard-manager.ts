import { DataRefreshEvent } from '../data/data-source/events/data-refresh-event';
import { DataSourceManager } from '../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../data/time-range/manager/time-range-manager';
import { ModelManager } from '../model/manager/model-manager';
import { DeserializationManager } from '../persistence/deserialization/deserialization-manager';
import { ModelJson } from '../persistence/model-json';
import { SerializationManager } from '../persistence/serialization/serialization-manager';
import { VariableManager } from '../variable/manager/variable-manager';
import { Dashboard } from './dashboard';
import { DefaultDashboard } from './default-dashboard';

/**
 * External API for managing dashboards
 */
export class DashboardManager {
  public constructor(
    private readonly deserializationManager: DeserializationManager,
    private readonly modelManager: ModelManager,
    private readonly variableManager: VariableManager,
    private readonly serializationManager: SerializationManager,
    private readonly dataSourceManager: DataSourceManager,
    private readonly dataRefreshEvent: DataRefreshEvent,
    private readonly timeRangeManager: TimeRangeManager
  ) {}

  /**
   * Transforms the provided JSON into an instantiated dashboard that can be rendered
   */
  // tslint:disable-next-line: no-any
  public create<TRoot extends object>(json: ModelJson): Dashboard<TRoot> {
    const root = this.deserializationManager.deserialize<TRoot>(json);

    return new DefaultDashboard(
      root,
      this.variableManager,
      this.timeRangeManager,
      this.serializationManager,
      this.modelManager,
      this.dataRefreshEvent,
      this.dataSourceManager
    );
  }
}
