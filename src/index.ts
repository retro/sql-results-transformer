import hash from 'hash-it';

type ValueOf<T> = T[keyof T];

type SchemaRequiredAttrs<S extends GenericSchema> =
  | ValueOf<S['transforms']>['requiredAttrs'][number]
  | S['pk'][number];

/*type SchemaRequiredAttrs<S extends GenericSchema> = string &
  (
    | ValueOf<{
        [Attr in keyof S['transforms']]: S['transforms'][Attr] extends TransformerGet<string>
          ? S['transforms'][Attr]['key']
          : S['transforms'][Attr] extends TransformerNestedSchema<
              GenericSchema,
              string
            >
          ? SchemaRequiredAttrs<S['transforms'][Attr]['schema']>
          : S['transforms'][Attr] extends TransformerNestedSchemaArray<
              GenericSchema,
              string
            >
          ? SchemaRequiredAttrs<S['transforms'][Attr]['schema']>
          : never;
      }>
    | S['pk'][number]
  );*/

type TransformInputType<S extends GenericSchema> = {
  [key in SchemaRequiredAttrs<S>]: unknown;
};

interface ITransformer {
  requiredAttrs: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (...args: any[]) => any;
}

type TransformReturnType<
  I extends Record<string, unknown>,
  S extends GenericSchema
> = {
  [Attr in keyof S['transforms']]: S['transforms'][Attr] extends TransformerGet<string>
    ? I[S['transforms'][Attr]['key']]
    : S['transforms'][Attr] extends TransformerNestOneSchema<
        GenericSchema,
        string
      >
    ? TransformReturnType<I, S['transforms'][Attr]['schema']>
    : S['transforms'][Attr] extends TransformerNestManySchema<
        GenericSchema,
        string
      >
    ? TransformReturnType<I, S['transforms'][Attr]['schema']>[]
    : never;
};

function getPkHash(pk: string[], item: Record<string, unknown>): number {
  const pkVal = pk.map((i) => item[i]);
  return hash(pkVal);
}

type GenericSchema = Schema<
  string,
  string,
  ITransformer,
  Record<string, ITransformer>
>;

export class TransformerGet<K extends string> implements ITransformer {
  readonly requiredAttrs: K[];
  readonly key: K;
  constructor(key: K) {
    this.key = key;
    this.requiredAttrs = [key];
  }
  transform<I extends Record<K, unknown>>(input: I[]): I[K] {
    return input[0][this.key];
  }
}

export class TransformerNestOneSchema<
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
  transform<I extends TransformInputType<this['schema']>>(input: I[]) {
    return this.schema.transform(input)[0];
  }
}

export class TransformerNestManySchema<
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
  transform<I extends TransformInputType<this['schema']>>(input: I[]) {
    return this.schema.transform(input);
  }
}

function transformsEntries(
  transforms: Record<string, ITransformer>
): [string, ITransformer][] {
  return Object.entries(transforms);
}

export class Schema<
  PK extends string,
  A extends string,
  T extends ITransformer,
  TS extends Record<A, T>
> {
  constructor(readonly pk: PK[], readonly transforms: TS) {}
  transform<I extends TransformInputType<this>>(
    input: I[]
  ): TransformReturnType<I, this>[] {
    const groupedByPk: Map<number, I[]> = new Map();

    input.forEach((element) => {
      const pkHash = getPkHash(this.pk, element);
      const acc = (
        groupedByPk.has(pkHash) ? groupedByPk.get(pkHash) : []
      ) as I[];
      groupedByPk.set(pkHash, [...acc, element]);
    });

    const acc: TransformReturnType<I, this>[] = [];

    for (const groupedItems of groupedByPk.values()) {
      const val: Record<string, unknown> = {};
      transformsEntries(this.transforms).forEach(([attr, t]) => {
        val[attr] = t.transform(groupedItems);
      });
      acc.push(val as TransformReturnType<I, this>);
    }

    return acc;
  }
}

export function schema<
  PK extends string,
  A extends string,
  T extends ITransformer,
  TS extends Record<A, T>
>(pk: PK[], transforms: TS) {
  return new Schema(pk, transforms);
}

export function pk<PK extends string>(...pk: PK[]) {
  return pk;
}

export function get<K extends string>(key: K) {
  return new TransformerGet(key);
}

export function nestOne<S extends GenericSchema>(schema: S) {
  return new TransformerNestOneSchema(schema);
}

export function nestMany<S extends GenericSchema>(schema: S) {
  return new TransformerNestManySchema(schema);
}
