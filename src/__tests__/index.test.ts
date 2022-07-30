import { describe, expect, it } from 'vitest';
import { schema } from '../index';

describe('simple decomposition', () => {
  it('should build schema with one attribute', () => {
    const s = schema('parent_id').pickMapped('parent_id', 'id');
    const decomposed = s.transform([{ parent_id: 1 }]);
    expect(decomposed).toEqual([{ id: 1 }]);
  });

  it('should build schema with multiple attributes', () => {
    const s = schema('parent_id')
      .pickMapped('parent_id', 'id')
      .pickMapped('parent_val', 'val');
    const decomposed = s.transform([{ parent_id: 1, parent_val: 'p1' }]);
    expect(decomposed).toEqual([{ id: 1, val: 'p1' }]);
  });

  it('should deduplicate and preserve order of items', () => {
    const s = schema('parent_id')
      .pickMapped('parent_id', 'id')
      .pickMapped('parent_val', 'val');
    const decomposed = s.transform([
      { parent_id: 1, parent_val: 'p1' },
      { parent_id: 2, parent_val: 'p2' },
      { parent_id: 1, parent_val: 'p1' },
    ]);
    expect(decomposed).toEqual([
      { id: 1, val: 'p1' },
      { id: 2, val: 'p2' },
    ]);
  });
});

/*describe('decompose()', () => {
  it('should collapse simple tree structures', () => {
    const data = [
      { parent_id: 1, parent_val: 'p1', children_id: 11, children_val: 'c1' },
      { parent_id: 1, parent_val: 'p1', children_id: 12, children_val: 'c2' },
    ];
    const decomposed = decompose(
      {
        pk: 'parent_id',
        schema: {
          id: 'parent_id',
          val: 'parent_val',
          children: {
            pk: 'children_id',
            schema: { id: 'children_id', val: 'children_val' },
          },
        },
      },
      data
    );
    expect(decomposed).toEqual({
      id: 1,
      val: 'p1',
      children: [
        { id: 11, val: 'c1' },
        { id: 12, val: 'c2' },
      ],
    });
  });
});*/
