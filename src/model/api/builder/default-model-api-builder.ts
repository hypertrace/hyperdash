import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../../../data/time-range/manager/time-range-manager';
import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { ThemeManager } from '../../../theming/theme-manager';
import { Logger } from '../../../util/logging/logger';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelDestroyedEvent } from '../../events/model-destroyed-event';
import { ModelManager } from '../../manager/model-manager';
import { DefaultModelApi } from '../default-model-api';
import { ModelApi } from '../model-api';
import { ModelApiBuilder } from './model-api-builder';

/**
 * Default implementation of `ModelApiBuilder`
 */
export class DefaultModelApiBuilder implements ModelApiBuilder<ModelApi> {
  public constructor(
    private readonly logger: Logger,
    private readonly modelManager: ModelManager,
    private readonly dataSourceManager: DataSourceManager,
    private readonly modelChangedEvent: ModelChangedEvent,
    private readonly modelDestroyedEvent: ModelDestroyedEvent,
    private readonly themeManager: ThemeManager,
    private readonly variableManager: VariableManager,
    private readonly deserializationManager: DeserializationManager,
    private readonly timeRangeManager: TimeRangeManager
  ) {}
  /**
   * @inheritdoc
   */
  public matches(): boolean {
    return true;
  }

  /**
   * @inheritdoc
   */
  public build(model: object): ModelApi {
    return new DefaultModelApi(
      model,
      this.logger,
      this.modelManager,
      this.dataSourceManager,
      this.modelChangedEvent,
      this.modelDestroyedEvent,
      this.themeManager,
      this.variableManager,
      this.deserializationManager,
      this.timeRangeManager
    );
  }
}
