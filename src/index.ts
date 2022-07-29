type Pk = string[];

type IHasDecompose<S extends string, T extends string> = {
  pk: Pk;
  source: S;
  target: T;
  mappings: { [k in T]: S };
};

type ValueOf<T> = T[keyof T];

interface IMappable {
  pk: Pk;
  decompose: (item: unknown) => unknown;
}

class Schema {
  constructor(readonly pk: Pk) {}
  withMapping<S1 extends string, T1 extends string>(source: S1, target: T1) {
    return new RootMapping(this.pk, source, target);
  }
}

class RootMapping<S extends string, T extends string>
  implements IHasDecompose<S, T>
{
  readonly pk: Pk;
  readonly source: S;
  readonly target: T;
  readonly mappings: { [k in T]: S };
  constructor(pk: Pk, source: S, target: T) {
    this.pk = pk;
    this.source = source;
    this.target = target;
    this.mappings = { [target]: source } as { [k in T]: S };
  }
  decompose<I extends Record<S, unknown>>(item: I): { [k in T]: I[S] } {
    return { [this.target]: item[this.source] } as { [k in T]: I[S] };
  }
  decomposeAll<I extends Record<S, unknown>>(items: I[]) {
    return items.map((i) => this.decompose(i));
  }
  withMapping<S1 extends string, T1 extends string>(source: S1, target: T1) {
    return new Mapping(this, source, target);
  }
}

class Mapping<
  P extends IHasDecompose<string, string>,
  S extends string,
  T extends string
> implements IHasDecompose<S, T>
{
  readonly pk: Pk;
  readonly source: S;
  readonly target: T;
  readonly mappings: P['mappings'] & { [k in T]: S };

  constructor(prev: P, source: S, target: T) {
    this.pk = prev.pk;
    this.source = source;
    this.target = target;
    this.mappings = { ...prev.mappings, [target]: source } as P['mappings'] & {
      [k in T]: S;
    };
  }

  decompose<I extends Record<ValueOf<this['mappings']>, unknown>>(item: I) {
    const val: Record<string, unknown> = {};
    Object.entries(this.mappings).forEach(([k, v]) => {
      val[k] = item[v as ValueOf<this['mappings']>];
    });
    return val as {
      [Property in keyof this['mappings']]: I[this['mappings'][Property]];
    };
  }

  decomposeAll<I extends Record<ValueOf<this['mappings']>, unknown>>(
    items: I[]
  ) {
    return items.map((i) => this.decompose(i));
  }

  withMapping<S1 extends string, T1 extends string>(source: S1, target: T1) {
    return new Mapping(this, source, target);
  }
}

export function schema(...pks: Pk) {
  return new Schema(pks);
}

const s = schema('foo')
  .withMapping('parent_val', 'val')
  .withMapping('parent_id', 'id');

const b = s.decomposeAll([
  { parent_val: 'foo', parent_id: 1 },
  { parent_val: 1, parent_id: 'foo' },
]);

/*const r = new RootMapping('parent_id', 'id')
  .withMapping('parent_val', 'val')
  .withMapping('parent_foo', 'foo');

const a = r.decompose({ parent_id: 1, parent_val: 'foo', parent_foo: 'foo' });*/
