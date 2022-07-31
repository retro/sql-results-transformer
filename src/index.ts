/*
import hash from 'hash-it';

type Pk = string;

type Mappings<S extends string, T extends string> = {
  [k in T]: S;
};

type IHasTransform<S extends string, T extends string> = {
  pk: Pk[];
  mappings: Mappings<S, T>;
};

type ValueOf<T> = T[keyof T];

type TransformInput<
  M extends Mappings<string, string>,
  P extends Pk[]
> = Record<ValueOf<M>, unknown> & { [key in P[number]]: unknown };

interface IMappable {
  transform: (item: unknown) => unknown;
}

function getPkHash(pk: Pk[], item: Record<string, unknown>): number {
  const pkVal = pk.map((i) => item[i]);
  return hash(pkVal);
}

class Schema<P extends Pk> {
  constructor(readonly pk: P[]) {}
  pickMapped<S1 extends string, T1 extends string>(
    sourceAttr: S1,
    targetAttr: T1
  ) {
    return new Mapping({}, this.pk, sourceAttr, targetAttr);
  }
  pick<T extends string>(attr: T) {
    return new Mapping({}, this.pk, attr, attr);
  }
}

class Mapping<
  P extends Pk,
  M extends Mappings<string, string>,
  S extends string,
  T extends string
> implements IHasTransform<S, T>
{
  readonly pk: P[];
  readonly mappings: M & Mappings<S, T>;

  constructor(prevMappings: M, prevPk: P[], sourceAttr: S, targetAttr: T) {
    this.pk = prevPk;
    this.mappings = {
      ...prevMappings,
      [targetAttr]: sourceAttr,
    } as M & Mappings<S, T>;
  }

  transform<I extends TransformInput<this['mappings'], this['pk']>>(
    items: I[]
  ) {
    const acc: Map<number, unknown> = new Map();
    for (const item of items) {
      const pkHash = getPkHash(this.pk, item);
      if (!acc.has(pkHash)) {
        const transformed: Record<string, unknown> = {};
        Object.entries(this.mappings).forEach(([k, v]) => {
          transformed[k] = item[v as ValueOf<this['mappings']>];
        });
        acc.set(pkHash, transformed);
      }
    }
    return Array.from(acc.values()) as Array<{
      [P in keyof this['mappings']]: I[this['mappings'][P]];
    }>;
  }

  pickMapped<S1 extends string, T1 extends string>(
    sourceAttr: S1,
    targetAttr: T1
  ) {
    return new Mapping(this.mappings, this.pk, sourceAttr, targetAttr);
  }

  pick<T extends string>(attr: T) {
    return new Mapping(this.mappings, this.pk, attr, attr);
  }
}

export function schema<T extends Pk>(...pks: T[]) {
  return new Schema(pks);
}*/

import hash from 'hash-it';

/*type Pk = string;

type Mappings<S extends string, T extends string> = {
  [k in T]: S;
};

type IHasTransform<S extends string, T extends string> = {
  pk: Pk[];
  mappings: Mappings<S, T>;
};

type ValueOf<T> = T[keyof T];

type TransformInput<T extends IHasTransform<string, string>> = Record<
  ValueOf<T['mappings']>,
  unknown
> & { [key in T['pk'][number]]: unknown };

type ExtendedMapping<
  M extends { mappings: Record<string, string> },
  S extends string,
  T extends string
> = M & { mappings: M['mappings'] & { [key in T]: S } };

type ExtendedNestedMapping<
  M extends { mappings: Record<string, string> },
  S extends IHasTransform<string, string>
> = M & { mappings: M['mappings'] & TransformInput<S> };

interface IMappable {
  transform: (item: unknown) => unknown;
}

function getPkHash(pk: Pk[], item: Record<string, unknown>): number {
  const pkVal = pk.map((i) => item[i]);
  return hash(pkVal);
}

class Schema<P extends Pk> {
  constructor(readonly pk: P[]) {}
  pickMapped<S1 extends string, T1 extends string>(
    sourceAttr: S1,
    targetAttr: T1
  ) {
    return new Mapping(this.pk, sourceAttr, targetAttr);
  }
  pick<T extends string>(attr: T) {
    return new Mapping(this.pk, attr, attr);
  }
}

class Mapping<P extends Pk, S extends string, T extends string>
  implements IHasTransform<S, T>
{
  readonly pk: P[];
  readonly mappings: Mappings<S, T>;

  constructor(pk: P[], sourceAttr: S, targetAttr: T) {
    this.pk = pk;
    this.mappings = {
      [targetAttr]: sourceAttr,
    } as Mappings<S, T>;
  }

  transform<I extends TransformInput<this>>(items: I[]) {
    const acc: Map<number, unknown> = new Map();
    for (const item of items) {
      const pkHash = getPkHash(this.pk, item);
      if (!acc.has(pkHash)) {
        const transformed: Record<string, unknown> = {};
        Object.entries(this.mappings).forEach(([k, v]) => {
          transformed[k] = item[v as ValueOf<this['mappings']>];
        });
        acc.set(pkHash, transformed);
      }
    }
    return Array.from(acc.values()) as Array<{
      [P in keyof this['mappings']]: I[this['mappings'][P]];
    }>;
  }

  pickMapped<S extends string, T extends string>(
    sourceAttr: S,
    targetAttr: T
  ): ExtendedMapping<this, S, T> {
    return Object.assign(Object.create(this), {
      ...this,
      mappings: { ...this.mappings, [targetAttr]: sourceAttr },
    });
  }

  pick<T extends string>(attr: T): ExtendedMapping<this, T, T> {
    return Object.assign(Object.create(this), {
      ...this,
      mappings: { ...this.mappings, [attr]: attr },
    });
  }
  nest<T extends string, S extends IHasTransform<string, string>>(
    target: T,
    schema: S
  ): ExtendedNestedMapping<this, S> {
    return Object.assign(Object.create(this), {
      ...this,
      mappings: { ...this.mappings, [target]: schema },
    });
  }
}

export function schema<T extends Pk>(...pks: T[]) {
  return new Schema(pks);
}

const c = schema('children_id').pickMapped('children_id', 'id');

const s = schema('foo', 'bar')
  .pickMapped('parent_val', 'val')
  .pickMapped('parent_id', 'id')
  //.pickMapped('parent_baz', 'baz')
  //.pick('qux')
  .nest('children', c);

const a = s.transform([
  { parent_id: 1, parent_val: 'val', foo: 1, bar: 2, parent_baz: 3 },
]);

/*const b = s.transform([
  { parent_val: 'foo', parent_id: 1, foo: 1, bar: 2 },
  { parent_val: '1', parent_id: 2, foo: '1', bar: 2 },
]);*/

type ValueOf<T> = T[keyof T];

type SchemaRequiredAttrs<
  S extends Schema<string, string, ITransformer, Record<string, ITransformer>>
> = ValueOf<S['transforms']>['requiredAttrs'][number] | S['pk'][number];

interface ITransformer {
  requiredAttrs: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (...args: any[]) => any;
}

class TransformerGet<K extends string> implements ITransformer {
  readonly requiredAttrs: K[];
  readonly key: K;
  constructor(key: K) {
    this.key = key;
    this.requiredAttrs = [key];
  }
  transform<I extends Record<K, unknown>>(input: I): I[K] {
    return input[this.key];
  }
}

class TransformerNestedSchema<
  S extends GenericSchema,
  A extends SchemaRequiredAttrs<S>
> implements ITransformer
{
  readonly requiredAttrs: A[];
  readonly schema: S;
  constructor(schema: S) {
    this.schema = schema;
    this.requiredAttrs = Object.values(this.schema.transforms).reduce(
      (acc: string[], t: ITransformer) => {
        return [...acc, ...t.requiredAttrs];
      },
      [...this.schema.pk]
    ) as A[];
  }
  transform<
    I extends {
      [k in SchemaRequiredAttrs<S>]: unknown;
    }
  >(input: I) {
    return this.schema.transform([input])[0];
  }
}

class TransformerNestedSchemaArray<
  S extends GenericSchema,
  A extends SchemaRequiredAttrs<S>
> implements ITransformer
{
  readonly requiredAttrs: A[];
  readonly schema: S;
  constructor(schema: S) {
    this.schema = schema;
    this.requiredAttrs = Object.values(this.schema.transforms).reduce(
      (acc: string[], t: ITransformer) => {
        return [...acc, ...t.requiredAttrs];
      },
      [...this.schema.pk]
    ) as A[];
  }
  transform<
    I extends {
      [k in SchemaRequiredAttrs<S>]: unknown;
    }
  >(input: I) {
    return this.schema.transform([input]);
  }
}

function transformsEntries(
  transforms: Record<string, ITransformer>
): [string, ITransformer][] {
  return Object.entries(transforms);
}

type TransformReturnType<
  I extends Record<string, unknown>,
  S extends GenericSchema
> = {
  [Attr in keyof S['transforms']]: S['transforms'][Attr] extends TransformerGet<string>
    ? I[S['transforms'][Attr]['key']]
    : S['transforms'][Attr] extends TransformerNestedSchema<
        GenericSchema,
        string
      >
    ? TransformReturnType<I, S['transforms'][Attr]['schema']>
    : S['transforms'][Attr] extends TransformerNestedSchemaArray<
        GenericSchema,
        string
      >
    ? TransformReturnType<I, S['transforms'][Attr]['schema']>[]
    : never;
};

type GenericSchema = Schema<
  string,
  string,
  ITransformer,
  Record<string, ITransformer>
>;

class Schema<
  PK extends string,
  A extends string,
  T extends ITransformer,
  TS extends Record<A, T>
> {
  constructor(readonly pk: PK[], readonly transforms: TS) {}
  transform<
    I extends {
      [k in SchemaRequiredAttrs<this>]: unknown;
    }
  >(input: I[]): TransformReturnType<I, this>[] {
    return input.map((i) => {
      const val: Record<string, unknown> = {};
      transformsEntries(this.transforms).forEach(([attr, t]) => {
        val[attr] = t.transform(i);
      });
      return val;
    }) as TransformReturnType<I, this>[];
  }
}

const a = new Schema(['article_id'], {
  title: new TransformerGet('article_title'),
});

const c = new Schema(['children_id'], {
  val: new TransformerGet('children_val'),
  article: new TransformerNestedSchema(a),
});

const s = new Schema(['parent_id'], {
  val: new TransformerGet('parent_val'),
  child: new TransformerNestedSchemaArray(c),
});

const val = s.transform([
  {
    parent_id: 1,
    parent_val: 'parent val',
    children_id: 1,
    children_val: 'children val',
    article_id: 1,
    article_title: 'Title',
  },
  {
    parent_id: 1,
    parent_val: 'parent val',
    children_id: 1,
    children_val: 'children val',
    article_id: 1,
    article_title: 22,
  },
]);
