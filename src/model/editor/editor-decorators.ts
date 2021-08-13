import { ObjectConstructable } from '../../util/constructable';
import { EditorRegistrationInformation } from './editor-library';

export const modelPropertyEditorRegistrations: {
  // tslint:disable-next-line:completed-docs
  editor: ObjectConstructable;
  // tslint:disable-next-line:completed-docs
  info: EditorRegistrationInformation;
}[] = [];
/**
 * Registers the decorated editor to the provided property type
 */

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function ModelPropertyEditor(
  registrationInfo: EditorRegistrationInformation
): (target: ObjectConstructable) => void {
  return (editorClass: ObjectConstructable): void => {
    modelPropertyEditorRegistrations.push({ editor: editorClass, info: registrationInfo });
  };
}
