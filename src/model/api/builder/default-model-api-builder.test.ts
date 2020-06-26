import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../../../data/time-range/manager/time-range-manager';
import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ThemeManager } from '../../../theming/theme-manager';
import { Logger } from '../../../util/logging/logger';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelDestroyedEvent } from '../../events/model-destroyed-event';
import { ModelManager } from '../../manager/model-manager';
import { DefaultModelApi } from '../default-model-api';
import { DefaultModelApiBuilder } from './default-model-api-builder';

describe('Default model api builder', () => {
  let builder: DefaultModelApiBuilder;
  let mockLogger: PartialObjectMock<Logger>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;
  let mockModelChangedEvent: PartialObjectMock<ModelChangedEvent>;
  let mockModelDestroyedEvent: PartialObjectMock<ModelDestroyedEvent>;
  let mockThemeManager: PartialObjectMock<ThemeManager>;
  let mockVariableManager: PartialObjectMock<VariableManager>;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockTimeRangeManager: PartialObjectMock<TimeRangeManager>;

  beforeEach(() => {
    mockLogger = {};
    mockModelManager = {};
    mockDataSourceManager = {};
    mockModelChangedEvent = {
      getObservableForModel: jest.fn().mockReturnValue({ pipe: jest.fn() })
    };
    mockModelDestroyedEvent = {
      getDestructionObservable: jest.fn()
    };
    mockThemeManager = {};
    mockVariableManager = {};
    mockDeserializationManager = {};
    mockTimeRangeManager = {};

    builder = new DefaultModelApiBuilder(
      mockLogger as Logger,
      mockModelManager as ModelManager,
      mockDataSourceManager as DataSourceManager,
      mockModelChangedEvent as ModelChangedEvent,
      mockModelDestroyedEvent as ModelDestroyedEvent,
      mockThemeManager as ThemeManager,
      mockVariableManager as VariableManager,
      mockDeserializationManager as DeserializationManager,
      mockTimeRangeManager as TimeRangeManager
    );
  });

  test('matches any model', () => {
    expect(builder.matches()).toBe(true);
  });

  test('returns instance of Default Model API', () => {
    expect(builder.build({})).toEqual(expect.any(DefaultModelApi));
  });
});
