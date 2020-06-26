import { ModelManager } from '../model/manager/model-manager';
import { ModelLibrary } from '../model/registration/model-registration';
import { PartialObjectMock } from '../test/partial-object-mock';
import { MergedTheme, Theme } from './theme';
import { ThemeManager } from './theme-manager';

describe('Theme manager', () => {
  let themeManager: ThemeManager;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelLibrary: PartialObjectMock<ModelLibrary>;

  const modelClass = class {};
  let mockModel: object;
  const modelType = 'test-model';
  const parentModelClass = class {};
  let mockParentModel: object;
  const parentModelType = 'test-parent-model';

  class TestTheme extends Theme {
    public constructor(partial: Partial<Theme>) {
      super();
      Object.assign(this, partial);
    }
  }

  // tslint:disable-next-line:max-classes-per-file
  class TestGlobalTheme extends TestTheme implements Required<Theme> {
    public backgroundColor!: string;
    public textColor!: string;
    public constructor(fullTheme: MergedTheme<Theme>) {
      super(fullTheme);
    }
  }

  const createThemeManager = () => {
    themeManager = new ThemeManager(
      mockModelManager as ModelManager,
      mockModelLibrary as ModelLibrary,
      new TestGlobalTheme({
        backgroundColor: 'white',
        textColor: 'black'
      })
    );
  };

  beforeEach(() => {
    mockModel = new modelClass();
    mockParentModel = new parentModelClass();
    mockModelLibrary = {
      lookupModelMetadata: jest.fn(lookupClass => {
        if (lookupClass === modelClass) {
          return { type: modelType };
        }
        if (lookupClass === parentModelClass) {
          return { type: parentModelType };
        }

        return undefined;
      }) as jest.Mock
    };
    mockModelManager = {
      getParent: jest.fn(model => (model === mockModel ? mockParentModel : undefined))
    };

    createThemeManager();
  });

  test('allows basic theme setting and retrieval, defaulting to global theme', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    expect(themeManager.getThemeForModel(mockModel)).toEqual({
      backgroundColor: 'white',
      textColor: 'orange'
    });

    expect(themeManager.getThemeForModel(mockParentModel)).toEqual({
      backgroundColor: 'white',
      textColor: 'black'
    });
  });

  test('allows removing themes', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    expect(themeManager.getThemeForModel(mockModel)).toEqual({
      backgroundColor: 'white',
      textColor: 'orange'
    });

    themeManager.removeThemeForModel(mockModel);

    expect(themeManager.getThemeForModel(mockModel)).toEqual({
      backgroundColor: 'white',
      textColor: 'black'
    });
  });

  test('returns new object every time', () => {
    const themeToSet = new TestTheme({
      backgroundColor: 'orange',
      textColor: 'red'
    });
    themeManager.setThemeForModel(themeToSet, mockModel);
    const firstGetResult = themeManager.getThemeForModel(mockModel);
    expect(firstGetResult).not.toBe(themeToSet);

    expect(themeManager.getThemeForModel(mockModel)).not.toBe(firstGetResult);
  });

  test('supports changing global theme', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    themeManager.setGlobalTheme(
      new TestGlobalTheme({
        backgroundColor: 'lightgray',
        textColor: 'green'
      })
    );

    expect(themeManager.getThemeForModel(mockModel)).toEqual({
      backgroundColor: 'lightgray',
      textColor: 'orange'
    });
  });

  test('merges themes based on model hierarchy', () => {
    themeManager.setThemeForModel(
      new TestTheme({
        backgroundColor: 'crimson',
        textColor: 'orange'
      }),
      mockParentModel
    );

    themeManager.setThemeForModel(
      new TestTheme({
        textColor: 'cornflowerblue'
      }),
      mockModel
    );

    expect(themeManager.getThemeForModel(mockParentModel)).toEqual({
      backgroundColor: 'crimson',
      textColor: 'orange'
    });

    expect(themeManager.getThemeForModel(mockModel)).toEqual({
      backgroundColor: 'crimson',
      textColor: 'cornflowerblue'
    });
  });

  test('modelJsonHasTheme can correctly identify json containing theme', () => {
    expect(themeManager.modelJsonHasTheme({ type: 'any' })).toBe(false);
    expect(themeManager.modelJsonHasTheme({ type: 'any', theme: 'any' })).toBe(false);
    // tslint:disable-next-line:no-null-keyword
    expect(themeManager.modelJsonHasTheme({ type: 'any', theme: null })).toBe(false);
    expect(themeManager.modelJsonHasTheme({ type: 'any', theme: {} })).toBe(true);
  });

  test('creates property location including a setter that correctly gets or sets themes', () => {
    spyOn(themeManager, 'setThemeForModel').and.callThrough();

    spyOn(themeManager, 'removeThemeForModel').and.callThrough();

    const location = themeManager.getPropertyLocationForTheme(mockModel);
    const theme = new TestTheme({});

    expect(location.toString()).toBe('theme');

    location.setProperty(theme);
    expect(themeManager.setThemeForModel).toHaveBeenCalledWith(theme, mockModel);
    expect(location.getProperty()).toBe(theme);

    location.setProperty(undefined);
    expect(themeManager.removeThemeForModel).toHaveBeenCalledWith(mockModel);
    expect(location.getProperty()).toBeUndefined();
  });

  test('allows retrieval of a single theme property based on property key', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    mockModelLibrary.lookupModelProperties = jest.fn().mockReturnValue(
      new Set([
        {
          key: 'text-color',
          runtimeKey: 'textColor'
        },
        {
          key: 'background-color',
          runtimeKey: 'backgroundColor'
        }
      ])
    );

    expect(themeManager.getThemePropertyForModel(mockModel, 'text-color')).toBe('orange');
    expect(themeManager.getThemePropertyForModel(mockModel, 'background-color')).toBe('white');
    expect(themeManager.getThemePropertyForModel(mockModel, "doesn't exist")).toBeUndefined();

    // Should go to global for unregistered model
    expect(themeManager.getThemePropertyForModel(mockParentModel, 'text-color')).toBe('black');
  });

  test('returns undefined for theme properties if themes have not been registered', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    mockModelLibrary.lookupModelProperties = jest.fn(() => []);
    expect(themeManager.getThemePropertyForModel(mockModel, 'text-color')).toBeUndefined();
  });

  test('returns original theme object for serialization', () => {
    const themeToSet = new TestTheme({ textColor: 'orange' });
    themeManager.setThemeForModel(themeToSet, mockModel);

    expect(themeManager.getThemeOverrideObjectProvidedByModel(mockModel)).toBe(themeToSet);

    // Should be merged, not the original
    expect(themeManager.getThemeForModel(mockModel)).not.toBe(themeToSet);
  });
});
