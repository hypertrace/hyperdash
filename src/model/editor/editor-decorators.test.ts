import { ModelPropertyEditor, modelPropertyEditorRegistrations } from './editor-decorators';

describe('Editor decorator', () => {
  test('should queue information to be retrieved later', () => {
    @ModelPropertyEditor({
      propertyType: 'decorator-test'
    })
    class DecoratorTestEditor {}

    expect(modelPropertyEditorRegistrations).toEqual([
      { info: { propertyType: 'decorator-test' }, editor: DecoratorTestEditor }
    ]);
  });
});
