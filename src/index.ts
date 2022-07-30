import hash from 'hash-it';

type Pk = string[];

type Mappings<S extends string, T extends string> = {
  [k in T]: S;
};

type IHasTransform<S extends string, T extends string> = {
  pk: Pk;
  mappings: Mappings<S, T>;
};

type ValueOf<T> = T[keyof T];

interface IMappable {
  transform: (item: unknown) => unknown;
}

function getPkHash(pk: Pk, item: Record<string, unknown>): number {
  const pkVal = pk.map((i) => item[i]);
  return hash(pkVal);
}

class Schema {
  constructor(readonly pk: Pk) {}
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
  P extends Mappings<string, string>,
  S extends string,
  T extends string
> implements IHasTransform<S, T>
{
  readonly pk: Pk;
  readonly mappings: P & Mappings<S, T>;

  constructor(prevMappings: P, prevPk: Pk, sourceAttr: S, targetAttr: T) {
    this.pk = prevPk;
    this.mappings = {
      ...prevMappings,
      [targetAttr]: sourceAttr,
    } as P & Mappings<S, T>;
  }

  transform<I extends Record<ValueOf<this['mappings']>, unknown>>(items: I[]) {
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

export function schema(...pks: Pk) {
  return new Schema(pks);
}

const s = schema('foo')
  .pickMapped('parent_val', 'val')
  .pickMapped('parent_id', 'id')
  .pick('foo');

const b = s.transform([
  { parent_val: 'foo', parent_id: 1, foo: 'bar' },
  { parent_val: '1', parent_id: 2, foo: 'baz' },
]);

/*const r = new RootMapping('parent_id', 'id')
  .pickMapped('parent_val', 'val')
  .pickMapped('parent_foo', 'foo');

const a = r.transform({ parent_id: 1, parent_val: 'foo', parent_foo: 'foo' });*/
