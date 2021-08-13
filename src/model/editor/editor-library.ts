import { uniq } from 'lodash-es';
import { DataSourceManager } from '../../data/data-source/manager/data-source-manager';
import { RendererLibrary } from '../../renderer/registration/renderer-registration';
import { Theme } from '../../theming/theme';
import { ThemeManager } from '../../theming/theme-manager';
import { ObjectConstructable, UnknownConstructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { ModelPropertyTypeInstance, ModelPropertyTypeLibrary } from '../property/model-property-type-library';
import { ModelPropertyType } from '../property/predefined/model-property-type';
import { PropertyLocation } from '../property/property-location';
import { ModelLibrary, ModelPropertyMetadata } from '../registration/model-registration';
import { modelPropertyEditorRegistrations } from './editor-decorators';

/**
 * Thoughts:
 * Create a new property type for each enum. That way, we can also do validation around it, localize
 * and potentially reuse actual editors.
 *
 * Editor container should aggregate changes and send them in some standard format.
 * Editor container should correctly nest.
 *
 */
/**
 * Editor library allows registering editor renderers to property types, and builds
 * a tree of information for generating dynamic editors given a specific model constructor
 */
export class EditorLibrary {
  private readonly editorMetadata: Map<string, EditorMetadata> = new Map();
  private lastDecoratorIndexRead: number = 0;

  public constructor(
    private readonly modelLibrary: ModelLibrary,
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary,
    private readonly logger: Logger,
    private readonly rendererLibrary: RendererLibrary,
    private readonly themeManager: ThemeManager,
    private readonly dataSourceManager: DataSourceManager
  ) {}

  /**
   * Registers the provided editor class to a given model property type. No action is taken if that
   * model property already has an editor.
   */
  public registerEditorRenderer(
    editorRendererClass: UnknownConstructable,
    registrationInformation: EditorRegistrationInformation
  ): void {
    this.processRegistrationQueue();
    this.registerEditorRendererInternal(editorRendererClass, registrationInformation);
  }

  /**
   * Gets data needed to build the editor for the provided model constructor, or undefined if the editor information
   * cannot be found.
   *  TODO Also show meta properties like data (maybe, more likely first-class), or theme
   */
  public getEditorData(modelConstructor: ObjectConstructable): CompositeEditorData | undefined {
    this.processRegistrationQueue();

    const metadata = this.modelLibrary.lookupModelMetadata(modelConstructor);

    if (!metadata) {
      this.logger.warn(`Attempted to lookup editor data for unregistered model class: ${modelConstructor.name}`);

      return undefined;
    }

    const modelPropertyEditors = Array.from(this.modelLibrary.lookupModelProperties(modelConstructor))
      .map(propertyMetadata => this.getModelPropertyEditorData(propertyMetadata))
      .filter((data): data is NestedEditorData => data !== undefined);

    const compositeData: CompositeEditorData = {
      title: metadata.displayName,
      subeditors: modelPropertyEditors,
      kind: EditorKind.Composite
    };
    const themeEditor = this.getThemeEditorForClass(modelConstructor);
    if (themeEditor) {
      compositeData.themeEditor = themeEditor;
    }
    const dataEditor = this.getDataEditorForClass(modelConstructor);
    if (dataEditor) {
      compositeData.dataEditor = dataEditor;
    }

    return compositeData;
  }

  private getModelPropertyEditorData(
    modelPropertyMetadata: ModelPropertyMetadata<object>
  ): NestedEditorData | undefined {
    const propertyTypeKey = modelPropertyMetadata.type.key;
    // We have a registered editor, use it
    if (this.editorMetadata.has(propertyTypeKey)) {
      return {
        title: modelPropertyMetadata.displayName,
        editor: this.editorMetadata.get(propertyTypeKey)!.renderer,
        validator: value =>
          this.modelPropertyTypeLibrary.getValidator(modelPropertyMetadata.type)(
            value,
            !modelPropertyMetadata.required,
            modelPropertyMetadata.type
          ),
        propertyMetadata: modelPropertyMetadata,
        kind: EditorKind.Leaf
      };
    }

    if (propertyTypeKey === ModelPropertyType.TYPE && modelPropertyMetadata.runtimeType !== undefined) {
      return this.getEditorMatchingModelClasses(
        [modelPropertyMetadata.runtimeType as ObjectConstructable],
        modelPropertyMetadata.displayName,
        modelPropertyMetadata.type,
        model => PropertyLocation.forModelProperty(model, modelPropertyMetadata.runtimeKey)
      );
    }

    return undefined;
  }

  /**
   * Internal version does not clear queue before proceeding
   */
  private registerEditorRendererInternal(
    editorRendererClass: UnknownConstructable,
    registrationInformation: EditorRegistrationInformation
  ): void {
    if (this.editorMetadata.has(registrationInformation.propertyType)) {
      this.logger.error(
        'Property types may only have one editor. ' +
          `Attempted to register [${editorRendererClass.name}] ` +
          `to [${registrationInformation.propertyType}], but already registered with ` +
          `[${this.editorMetadata.get(registrationInformation.propertyType)!.renderer.name}]`
      );

      return;
    }

    this.editorMetadata.set(registrationInformation.propertyType, { renderer: editorRendererClass });
  }

  private processRegistrationQueue(): void {
    // tslint:disable-next-line:max-line-length
    for (
      this.lastDecoratorIndexRead;
      this.lastDecoratorIndexRead < modelPropertyEditorRegistrations.length;
      this.lastDecoratorIndexRead++
    ) {
      const registration = modelPropertyEditorRegistrations[this.lastDecoratorIndexRead];
      this.registerEditorRendererInternal(registration.editor, registration.info);
    }
  }

  private getEditorMatchingModelClasses<T>(
    modelClasses: ObjectConstructable[],
    displayName: string,
    typeInstance: ModelPropertyTypeInstance,
    getPropertyLocation: (model: object) => PropertyLocation<T>
  ): MultipleEditorData | UnresolvedCompositeEditorData | undefined {
    const allMatchingEditors = this.getAllCompatibleModelClasses(modelClasses).map(
      (compatibleConstructor): UnresolvedCompositeEditorData => ({
        title: this.modelLibrary.lookupModelMetadata(compatibleConstructor)!.displayName,
        modelClass: compatibleConstructor,
        propertyTypeInstance: typeInstance,
        getPropertyLocation: getPropertyLocation as <P>() => PropertyLocation<P>,
        kind: EditorKind.Unresolved
      })
    );

    if (allMatchingEditors.length === 0) {
      return undefined;
    }
    if (allMatchingEditors.length === 1) {
      return {
        ...allMatchingEditors[0],
        title: displayName
      };
    }

    return {
      title: displayName,
      compatibleEditors: allMatchingEditors,
      kind: EditorKind.Multiple
    };
  }

  private getAllCompatibleModelClasses(modelClasses: ObjectConstructable[]): ObjectConstructable[] {
    return uniq(modelClasses.flatMap(modeClass => this.modelLibrary.getAllCompatibleModelClasses(modeClass)));
  }

  private getThemeEditorForClass(
    modelClass: ObjectConstructable
  ): MultipleEditorData | UnresolvedCompositeEditorData | undefined {
    if (this.rendererLibrary.hasRenderer(modelClass)) {
      return this.getEditorMatchingModelClasses([Theme], 'Theme', { key: '_theme' }, model =>
        this.themeManager.getPropertyLocationForTheme(model)
      );
    }

    return undefined;
  }

  private getDataEditorForClass(
    modelClass: ObjectConstructable
  ): MultipleEditorData | UnresolvedCompositeEditorData | undefined {
    // Always defined, we've already done this lookup to get this far
    const modelMetadata = this.modelLibrary.lookupModelMetadata(modelClass)!;

    return this.getEditorMatchingModelClasses(modelMetadata.supportedDataSourceTypes, 'Data', { key: '_data' }, model =>
      this.dataSourceManager.getPropertyLocationForData(model)
    );
  }
}

export type NestedEditorData = LeafEditorData | MultipleEditorData | UnresolvedCompositeEditorData;

interface EditorMetadata {
  /**
   * Renderable object for editor
   */
  renderer: UnknownConstructable;
}

/**
 * Discriminating enum for editor subtypes
 */
export enum EditorKind {
  /**
   * Indicates composite type
   * @see CompositeEditorData
   */
  Composite,
  /**
   * Indicates leaf type
   * @see LeafEditorData
   */
  Leaf,
  /**
   * Indicates multiple type
   * @see MultipleEditorData
   */
  Multiple,
  /**
   * Indicates unresolved type
   * @see UnresolvedCompositeEditorData
   */
  Unresolved
}

/**
 * Data representing an editor or editor fragment for the referenced `modelClass`
 */
export interface EditorData {
  /**
   * Display title for editor
   */
  title: string;

  /**
   * Discriminator
   */
  kind: EditorKind;
}

/**
 * Data for a grouping of editors based on a model. This does not represent an editor itself, but should
 * be composed of subeditors.
 */
export interface CompositeEditorData extends EditorData {
  /**
   * Editors for properties of this model
   */
  subeditors: NestedEditorData[];

  /**
   * @inheritdoc
   */
  kind: EditorKind.Composite;

  /**
   * Editor for the theme of this model. Undefined if model is not themable.
   */
  themeEditor?: MultipleEditorData | UnresolvedCompositeEditorData;

  /**
   * Editor for the data source of this model. Undefined if model does not support data
   */
  dataEditor?: MultipleEditorData | UnresolvedCompositeEditorData;
}

/**
 * Represents an editor for a leaf property - that is a primitive or primitive collection,
 * as opposed to a model
 */
export interface LeafEditorData extends EditorData {
  /**
   * Validator for property, returning a string on validation failure or undefined otherwise
   */
  validator(value: unknown): string | undefined;

  /**
   * Renderable object for editor
   */
  editor: UnknownConstructable;

  /**
   * Metadata for the editable property
   */
  propertyMetadata: ModelPropertyMetadata<object>;

  /**
   * @inheritdoc
   */
  kind: EditorKind.Leaf;
}

/**
 * Represents a model inside another model. We don't use CompositeEditorData directly to prevent
 * infinite recursive loops from self referencing models (or cycles).
 */
export interface UnresolvedCompositeEditorData extends EditorData {
  /**
   * Model class represented by this editor
   */
  modelClass: ObjectConstructable;

  /**
   * @inheritdoc
   */
  kind: EditorKind.Unresolved;

  /**
   * Retrieves Property Location for this field in the provided model
   */
  getPropertyLocation<T>(model: object): PropertyLocation<T>;

  /**
   * Property type instance for this property
   */
  propertyTypeInstance: ModelPropertyTypeInstance;
}

/**
 * Represents a property that has multiple compatible models available.
 */
export interface MultipleEditorData extends EditorData {
  /**
   * Array of compatible model editor datas
   */
  compatibleEditors: UnresolvedCompositeEditorData[];

  /**
   * @inheritdoc
   */
  kind: EditorKind.Multiple;
}

/**
 * Metadata needed to register a new editor
 */
export interface EditorRegistrationInformation {
  /**
   * Property type associated with the editor being registered
   */
  propertyType: string;
}
