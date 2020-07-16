import { isNil } from 'lodash-es';
import { DataSourceManager } from '../../data/data-source/manager/data-source-manager';
import { RendererLibrary } from '../../renderer/registration/renderer-registration';
import { PartialObjectMock } from '../../test/partial-object-mock';
import { Theme } from '../../theming/theme';
import { ThemeManager } from '../../theming/theme-manager';
import { ObjectConstructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { ModelPropertyTypeInstance, ModelPropertyTypeLibrary } from '../property/model-property-type-library';
import { ModelPropertyType } from '../property/predefined/model-property-type';
import { ModelLibrary, ModelPropertyMetadata, ModelRegistrationInformation } from '../registration/model-registration';
import { ModelPropertyEditor, modelPropertyEditorRegistrations } from './editor-decorators';
import {
  EditorKind,
  EditorLibrary,
  LeafEditorData,
  MultipleEditorData,
  UnresolvedCompositeEditorData
} from './editor-library';

describe('Editor library', () => {
  let editorLibrary: EditorLibrary;
  let mockModelLibrary: PartialObjectMock<ModelLibrary>;
  let mockModelPropertyLibrary: PartialObjectMock<ModelPropertyTypeLibrary>;
  let mockLogger: PartialObjectMock<Logger>;
  let mockRendererLibrary: PartialObjectMock<RendererLibrary>;
  let mockThemeManager: PartialObjectMock<ThemeManager>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;

  const modelClass = class {};

  const mockPropertyMetadata: Partial<ModelPropertyMetadata<{}>>[] = [
    {
      displayName: 'First Property Display Name',
      type: { key: 'first-property' },
      required: true
    },
    {
      displayName: 'Second Property Display Name',
      type: { key: 'second-property' },
      required: false
    }
  ];

  beforeEach(() => {
    mockModelLibrary = {
      lookupModelMetadata: jest.fn((searchClass: ObjectConstructable) => {
        if (searchClass === modelClass) {
          return {
            displayName: 'Model Display Name',
            supportedDataSourceTypes: []
          };
        }

        return {
          displayName: searchClass.name,
          supportedDataSourceTypes: []
        };
      }),
      lookupModelProperties: jest.fn(() => new Set(mockPropertyMetadata)),
      getAllCompatibleModelClasses: jest.fn(input => [input])
    };
    mockModelPropertyLibrary = {};
    mockLogger = {
      warn: jest.fn()
    };
    mockRendererLibrary = {
      hasRenderer: jest.fn(searchClass => searchClass !== Theme)
    };

    mockThemeManager = {
      getPropertyLocationForTheme: jest.fn()
    };

    mockDataSourceManager = {
      getPropertyLocationForData: jest.fn()
    };

    editorLibrary = new EditorLibrary(
      mockModelLibrary as ModelLibrary,
      mockModelPropertyLibrary as ModelPropertyTypeLibrary,
      mockLogger as Logger,
      mockRendererLibrary as RendererLibrary,
      mockThemeManager as ThemeManager,
      mockDataSourceManager as DataSourceManager
    );
  });

  test('should allow registering and retrieving editors', () => {
    const propertyEditor1 = class {};
    const propertyEditor2 = class {};

    editorLibrary.registerEditorRenderer(propertyEditor1, { propertyType: 'first-property' });
    editorLibrary.registerEditorRenderer(propertyEditor2, { propertyType: 'second-property' });

    expect(editorLibrary.getEditorData(modelClass)).toEqual(
      expect.objectContaining({
        subeditors: [
          expect.objectContaining({
            editor: propertyEditor1
          }),
          expect.objectContaining({
            editor: propertyEditor2
          })
        ]
      })
    );
  });

  test('should return undefined if model class is not registered', () => {
    mockModelLibrary.lookupModelMetadata = jest.fn();
    expect(editorLibrary.getEditorData(class TestUnregistered {})).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Attempted to lookup editor data for unregistered model class: TestUnregistered'
    );
  });

  test('should only return subeditors for properties with defined editors', () => {
    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'first-property' });

    expect(editorLibrary.getEditorData(modelClass)).toEqual(
      expect.objectContaining({
        subeditors: [
          expect.objectContaining({
            title: 'First Property Display Name'
          })
        ]
      })
    );
  });

  test('should return appropriate validator for each editor', () => {
    mockModelPropertyLibrary.getValidator = jest.fn(
      (propertyType: ModelPropertyTypeInstance) => (value: string, allowUndefinedOrNull: boolean) => {
        if (allowUndefinedOrNull && isNil(value)) {
          return undefined;
        }

        return value === `${propertyType.key} value` ? undefined : 'Failed';
      }
    );

    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'first-property' });
    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'second-property' });
    const editorMetadata = editorLibrary.getEditorData(modelClass)!;

    const firstPropertyValidator = (editorMetadata.subeditors[0] as LeafEditorData).validator;

    expect(firstPropertyValidator('first-property value')).toBeUndefined();
    expect(firstPropertyValidator('random value')).toBe('Failed');
    expect(firstPropertyValidator(undefined)).toBe('Failed');

    const secondPropertyValidator = (editorMetadata.subeditors[1] as LeafEditorData).validator;

    expect(secondPropertyValidator('second-property value')).toBeUndefined();
    expect(secondPropertyValidator('random value')).toBe('Failed');
    expect(secondPropertyValidator(undefined)).toBeUndefined();
  });

  test('should return correct title for each editor', () => {
    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'first-property' });

    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'second-property' });
    expect(editorLibrary.getEditorData(modelClass)).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [
        expect.objectContaining({
          title: 'First Property Display Name'
        }),
        expect.objectContaining({
          title: 'Second Property Display Name'
        })
      ],
      themeEditor: expect.objectContaining({
        title: 'Theme'
      })
    });
  });

  test('should log an error an error and discard data if attempting to overwrite editor registration', () => {
    mockLogger.error = jest.fn();
    const propertyEditor1 = class FirstEditor {};
    const propertyEditor2 = class SecondEditor {};
    editorLibrary.registerEditorRenderer(propertyEditor1, { propertyType: 'first-property' });
    editorLibrary.registerEditorRenderer(propertyEditor2, { propertyType: 'first-property' });

    expect(editorLibrary.getEditorData(modelClass)).toEqual(
      expect.objectContaining({
        subeditors: [
          expect.objectContaining({
            editor: propertyEditor1
          })
        ]
      })
    );

    expect(mockLogger.error)
      // tslint:disable-next-line:max-line-length
      .toHaveBeenCalledWith(
        'Property types may only have one editor. Attempted to register [SecondEditor] to [first-property], but already registered with [FirstEditor]'
      );
  });

  test('editors are returned in the order of model property registration', () => {
    mockModelLibrary.lookupModelProperties = jest.fn(() => new Set([mockPropertyMetadata[1], mockPropertyMetadata[0]]));
    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'first-property' });

    editorLibrary.registerEditorRenderer(class {}, { propertyType: 'second-property' });

    expect(editorLibrary.getEditorData(modelClass)).toEqual(
      expect.objectContaining({
        subeditors: [
          expect.objectContaining({
            title: 'Second Property Display Name'
          }),
          expect.objectContaining({
            title: 'First Property Display Name'
          })
        ]
      })
    );
  });

  test('editors registered via decorators are available', () => {
    @ModelPropertyEditor({
      propertyType: 'first-property'
    })
    class DecoratorTestEditor {}

    expect(editorLibrary.getEditorData(modelClass)).toEqual(
      expect.objectContaining({
        subeditors: [
          expect.objectContaining({
            editor: DecoratorTestEditor
          })
        ]
      })
    );

    // Cleanup - decorator state is global, don't want test leaving state
    modelPropertyEditorRegistrations.pop();
  });

  test('handles nested editors', () => {
    const propertyEditor = class {};

    editorLibrary.registerEditorRenderer(propertyEditor, { propertyType: 'first-property' });

    (mockModelLibrary.lookupModelProperties as jest.Mock).mockReturnValueOnce(
      new Set([
        {
          displayName: 'Parent Model Property',
          type: { key: ModelPropertyType.TYPE },
          required: true,
          runtimeType: modelClass,
          runtimeKey: 'runtimeKey'
        }
      ])
    );

    const editorData = editorLibrary.getEditorData(modelClass);

    expect(editorData).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [
        {
          title: 'Parent Model Property',
          modelClass: modelClass,
          kind: EditorKind.Unresolved,
          propertyTypeInstance: {
            key: ModelPropertyType.TYPE
          },
          getPropertyLocation: expect.any(Function)
        }
      ],
      themeEditor: expect.any(Object)
    });

    const unresolvedEditorData = editorData!.subeditors[0] as UnresolvedCompositeEditorData;
    const childEditorData = editorLibrary.getEditorData(unresolvedEditorData.modelClass);
    expect(childEditorData).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [
        {
          title: 'First Property Display Name',
          editor: propertyEditor,
          kind: EditorKind.Leaf,
          propertyMetadata: mockPropertyMetadata[0],
          validator: expect.any(Function)
        }
      ],
      themeEditor: expect.any(Object)
    });

    const model = new modelClass();
    const childLocation = unresolvedEditorData.getPropertyLocation(model);
    expect(childLocation.toString()).toBe('runtimeKey');
    expect(childLocation.parentModel).toBe(model);
  });

  test('handles no compatible nested editors', () => {
    mockModelLibrary.getAllCompatibleModelClasses = jest.fn(input => (input === Theme ? [Theme] : []));
    mockModelLibrary.lookupModelProperties = jest.fn(
      () =>
        new Set([
          {
            displayName: 'Parent Model Property',
            type: { key: ModelPropertyType.TYPE },
            required: true,
            runtimeType: class Unregistered {}
          }
        ])
    );

    expect(editorLibrary.getEditorData(modelClass)).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [],
      themeEditor: expect.any(Object)
    });

    mockModelLibrary.lookupModelProperties = jest.fn(
      () =>
        new Set([
          {
            displayName: 'Parent Model Property',
            type: ModelPropertyType.TYPE,
            required: true,
            runtimeType: undefined
          }
        ])
    );

    expect(editorLibrary.getEditorData(modelClass)).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [],
      themeEditor: expect.any(Object)
    });
  });

  test('handles multiple compatible nested editors', () => {
    const childClass1 = class FirstChildClass extends modelClass {};
    const childClass2 = class SecondChildClass extends modelClass {};
    mockModelLibrary.getAllCompatibleModelClasses = jest.fn(input =>
      input === Theme ? [Theme] : [childClass1, childClass2]
    );

    (mockModelLibrary.lookupModelProperties as jest.Mock).mockReturnValueOnce(
      new Set([
        {
          displayName: 'Parent Model Property',
          type: { key: ModelPropertyType.TYPE },
          required: true,
          runtimeType: modelClass
        }
      ])
    );

    const editorData = editorLibrary.getEditorData(modelClass);

    expect(editorData).toEqual({
      title: 'Model Display Name',
      kind: EditorKind.Composite,
      subeditors: [
        {
          title: 'Parent Model Property',
          kind: EditorKind.Multiple,
          compatibleEditors: [
            {
              title: 'FirstChildClass',
              modelClass: childClass1,
              getPropertyLocation: expect.any(Function),
              propertyTypeInstance: {
                key: ModelPropertyType.TYPE
              },
              kind: EditorKind.Unresolved
            },
            {
              title: 'SecondChildClass',
              modelClass: childClass2,
              getPropertyLocation: expect.any(Function),
              propertyTypeInstance: {
                key: ModelPropertyType.TYPE
              },
              kind: EditorKind.Unresolved
            }
          ]
        }
      ],
      themeEditor: expect.any(Object)
    });

    const compatibleEditors = (editorData!.subeditors[0] as MultipleEditorData).compatibleEditors;
    editorLibrary.getEditorData = jest.fn();

    expect(compatibleEditors[0].modelClass).toBe(childClass1);

    expect(compatibleEditors[1].modelClass).toBe(childClass2);
  });

  test('provides theme editor for composite editor data', () => {
    const editorData = editorLibrary.getEditorData(modelClass)!;
    expect(editorData).toMatchObject({
      themeEditor: {
        title: 'Theme',
        modelClass: Theme,
        kind: EditorKind.Unresolved,
        getPropertyLocation: expect.any(Function)
      }
    });

    mockModelLibrary.lookupModelMetadata = jest.fn<
      Required<ModelRegistrationInformation> | undefined,
      [ObjectConstructable]
    >(value =>
      value === Theme ? { type: 'theme', displayName: 'Theme Object', supportedDataSourceTypes: [] } : undefined
    );

    const themeEditor = editorData.themeEditor as UnresolvedCompositeEditorData;
    expect(editorLibrary.getEditorData(themeEditor.modelClass)).toEqual({
      title: 'Theme Object',
      subeditors: [],
      kind: EditorKind.Composite
    });

    (mockThemeManager.getPropertyLocationForTheme as jest.Mock).mockReturnValueOnce('mock property location');
    const model = new modelClass();
    expect(themeEditor.getPropertyLocation(model)).toBe('mock property location');
  });

  test('omits theme editor for non renderable model', () => {
    mockRendererLibrary.hasRenderer = jest.fn().mockReturnValue(false);
    const editorData = editorLibrary.getEditorData(modelClass)!;
    expect(editorData).not.toMatchObject({
      themeEditor: expect.anything()
    });
  });

  test('provides multiple theme editor data if available', () => {
    const themeClass1 = class FirstTheme extends Theme {};

    const themeClass2 = class SecondTheme extends Theme {};
    mockModelLibrary.getAllCompatibleModelClasses = jest.fn(input =>
      input === Theme ? [themeClass1, themeClass2] : [input]
    );

    expect(editorLibrary.getEditorData(modelClass)).toMatchObject({
      themeEditor: {
        title: 'Theme',
        compatibleEditors: [
          {
            title: 'FirstTheme',
            modelClass: themeClass1,
            kind: EditorKind.Unresolved
          },
          {
            title: 'SecondTheme',
            modelClass: themeClass2,
            kind: EditorKind.Unresolved
          }
        ],
        kind: EditorKind.Multiple
      }
    });
  });

  test('does not provides data editor if no data source classes registered', () => {
    const editorData = editorLibrary.getEditorData(modelClass)!;

    expect(editorData).not.toMatchObject({
      dataEditor: expect.anything()
    });
  });

  test('provides data editor if single data source class registered', () => {
    const mockDataSourceClass = class {};

    mockModelLibrary.lookupModelMetadata = jest.fn((searchClass: ObjectConstructable) => {
      if (searchClass === modelClass) {
        return {
          displayName: 'Model Display Name',
          supportedDataSourceTypes: [mockDataSourceClass]
        };
      }
      if (searchClass === mockDataSourceClass) {
        return {
          displayName: 'Mock data source class',
          supportedDataSourceTypes: []
        };
      }

      return {
        displayName: searchClass.name,
        supportedDataSourceTypes: []
      };
    });

    const editorData = editorLibrary.getEditorData(modelClass)!;
    expect(editorData).toMatchObject({
      dataEditor: {
        title: 'Data',
        modelClass: mockDataSourceClass,
        kind: EditorKind.Unresolved,
        getPropertyLocation: expect.any(Function)
      }
    });

    (mockDataSourceManager.getPropertyLocationForData as jest.Mock).mockReturnValueOnce('mock data location');
    const model = new modelClass();
    expect((editorData.dataEditor as UnresolvedCompositeEditorData).getPropertyLocation(model)).toBe(
      'mock data location'
    );
  });

  test('provides data editor if multiple data source classes registered', () => {
    const mockDataSourceClass1 = class {};
    const mockDataSourceClass2 = class {};

    mockModelLibrary.lookupModelMetadata = jest.fn((searchClass: ObjectConstructable) => {
      if (searchClass === modelClass) {
        return {
          displayName: 'Model Display Name',
          supportedDataSourceTypes: [mockDataSourceClass1, mockDataSourceClass2]
        };
      }

      return {
        displayName: searchClass.name,
        supportedDataSourceTypes: []
      };
    });

    const editorData = editorLibrary.getEditorData(modelClass)!;
    expect(editorData).toMatchObject({
      dataEditor: {
        title: 'Data',
        kind: EditorKind.Multiple,
        compatibleEditors: [
          {
            kind: EditorKind.Unresolved,
            modelClass: mockDataSourceClass1
          },
          {
            kind: EditorKind.Unresolved,
            modelClass: mockDataSourceClass2
          }
        ]
      }
    });
  });
});
