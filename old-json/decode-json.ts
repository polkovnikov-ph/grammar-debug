import { handle } from "../ft";
import { TypeName, TypeFromName, checkType, typeNameToString, NonReferenceType, Json, singleton } from "../lodash";
import { MergedError } from "../merged-error";

type Jsonish = undefined | null | boolean | number | string | Jsonish[] | { [key: string]: Jsonish }

class Context {
    private path: string[] = [];
    dive = <T,>(key: string, callback: () => T): T => {
        this.path.push(key);
        try {
            return callback();
        } finally {
            this.path.pop();
        }
    }
    assert: (condition: boolean, expected: string, got: string) => asserts condition = (condition, expected, got) => {
        if (!condition) {
            throw new Error(`At ${this.path.join('.')}: expected ${expected}, got ${got}`);
        }
    }
    assertType: <K extends TypeName>(value: Jsonish, type: K) => asserts value is Jsonish & TypeFromName[K] = (value, type) => {
        this.assert(checkType(value, type), typeNameToString(type), typeof value);
    }
}

declare const type: unique symbol;
interface DecoderT<T> {
    [type]: T;
}
type DecoderR<T> = (json: Jsonish, context: Context) => T
const pack = <T,>(decoder: DecoderR<T>) => decoder as unknown as DecoderT<T>;
const unpack = <T,>(decoder: DecoderT<T>, json: Jsonish, context: Context) => {
    return (decoder as unknown as DecoderR<T>)(json, context);
};
declare const Decoder: unique symbol;
type Decoder = typeof Decoder
declare module '../ft' {
    interface Hkt<T> {
        [Decoder]: DecoderT<T>
    }
}

const primitive = <K extends TypeName>(type: K) => {
    return pack<TypeFromName[K]>((json: Jsonish, ctx: Context) => {
        ctx.assertType(json, type);
        return json;
    });
};
export const decodeNumber = primitive(TypeName.Number);
export const decodeString = primitive(TypeName.String);
export const decodeBoolean = primitive(TypeName.Boolean);

export const decodeLiteral = <T extends NonReferenceType>(value: T) => {
    return pack<T>((json: Jsonish, ctx: Context) => {
        ctx.assert(json === value, '' + value, '' + json);
        return value;
    });
};

export const decodeAnyOf = <T extends NonReferenceType[]>(...values: T) => {
    const set = new Set(values);
    const message = 'one of ' + values.join(', ');
    return pack<T[number]>((json: Jsonish, ctx: Context): T[number] => {
        ctx.assert(typeof json !== 'object' && typeof json !== 'undefined', 'non-reference type', typeof json);
        ctx.assert(set.has(json), message, '' + json);
        return json;
    });
}

export const decodeMaybe = <T,>(child: DecoderT<T>) => {
    return pack<T | undefined>((json, ctx: Context) => {
        return json === undefined ? undefined : unpack(child, json, ctx);
    });
};

export const decodeObject = <O extends object>(children: { [K in keyof O]: DecoderT<O[K]> }) => {
    return pack<O>((json, ctx: Context) => {
        ctx.assertType(json, TypeName.Object);
        const result = {} as O;
        for (const key in children) {
            result[key] = ctx.dive(key, () => unpack(children[key], json[key], ctx));
        }
        return result;
    });
};

export const decodeRecord = <K extends string, V>(key: DecoderT<K>, value: DecoderT<V>) => {
    return pack<Record<K, V>>((json: Jsonish, ctx: Context) => {
        ctx.assertType(json, TypeName.Object);
        const result = {} as Record<K, V>;
        for (const k in json) {
            const parsedK = ctx.dive('key', () => unpack(key, k, ctx));
            result[parsedK] = ctx.dive(parsedK, () => unpack(value, json[k], ctx));
        }
        return result;
    });
};

export const decodeArray = <T,>(child: DecoderT<T>) => {
    return pack<T[]>((json, ctx: Context) => {
        ctx.assertType(json, TypeName.Array);
        return json.map((item, key) => ctx.dive('' + key, () => unpack(child, item, ctx)));
    });
};

interface ChainTuple<R extends any[]> {
    add: <T>(type: DecoderT<T>) => ChainTuple<[...R, T]>;
    end: DecoderT<R>;
}
const chainTuple = <R extends any[]>(
    length: number, 
    input: (json: Jsonish[], ctx: Context, result: R) => void,
): ChainTuple<R> => {
    const add = <T,>(type: DecoderT<T>) => chainTuple<[...R, T]>(
        length + 1,
        (json, ctx: Context, result) => {
            input(json, ctx, result as unknown as R);
            result[length] = ctx.dive(String(length), () => unpack(type, json[length], ctx));
        },
    );
    const end = pack<R>((json, ctx: Context) => {
        const result = new Array(length) as R;
        ctx.assertType(json, TypeName.Array);
        ctx.assert(json.length === length, 'tuple of ' + length, 'tuple of ' + json.length);
        input(json, ctx, result);
        return result;
    });
    return {add, end};
};
export const decodeTuple = chainTuple<[]>(0, () => {});

/*
We don't keep unions to prevent `in` further in the code, which is unsafe.

interface A { a(): string };
interface B { b(): string };

function f(x: A | B): string {
  if ("a" in x) {
    return x.a();
  } else {
    return x.b();
  }
}

const x = { a: 10, b() { return "hello"; } };
const y: B = x;
f(y);
*/
interface ChainUnion<R extends {}> {
    add: <T, K extends string>(name: K, type: DecoderT<Exclude<T, R>>) => ChainUnion<R | { type: K, value: T }>;
    end: DecoderT<R>;
}
const createUnion = <R extends {}>(input: DecoderT<R>): ChainUnion<R> => {
    const add = <T, K extends string>(
        name: K,
        type: DecoderT<T>,
    ) => createUnion(pack<R | { type: K, value: T }>((json, ctx: Context) => {
        try {
            return unpack(input, json, ctx);
        } catch (e1) {
            try {
                return {type: name, value: unpack(type, json, ctx)};
            } catch (e2) {
                throw new MergedError(e1, e2);
            }
        }
    }));
    return {add, end: input};
};
export const decodeUnionUnsafe = createUnion<never>(pack(() => {
    throw new MergedError();
}));

export const decodeUnion = <K extends string, O extends Record<string, object>>(
    discriminator: K,
    children: { [L in keyof O]: DecoderT<O[L]> }
) => {
    const message = 'one of ' + Object.keys(children).join(', ');
    return pack((json, ctx: Context) => {
        ctx.assertType(json, TypeName.Object);
        ctx.assert(discriminator in json, 'has field ' + discriminator, 'none');
        const type = ctx.dive(discriminator, () => {
            const type = json[discriminator];
            ctx.assertType(type, TypeName.String);
            ctx.assert(type in children, message, type);
            return type;
        });
        return {
            [discriminator]: type,
            ...unpack(children[type], json, ctx),
        } as { [L in keyof O]: { [M in K]: L } & O[L] }[keyof O];
    });
};

interface ChainIntersect<R> {
    add: <T extends object>(type: DecoderT<T>) => ChainIntersect<R & T>;
    end: DecoderT<R>;
}
export const decodeIntersect = <R extends object>(input: DecoderT<R>): ChainIntersect<R> => {
    const add = <T extends object>(type: DecoderT<T>) => decodeIntersect<R & T>(pack((json, ctx: Context) => ({
        ...unpack(input, json, ctx),
        ...unpack(type, json, ctx),
    })));
    return {add, end: input};
};

export const decodeAny = pack((json) => json);

export const decodeNever = pack((_json, ctx: Context) => {
    ctx.assert(false, 'nothing', 'something');
});


export const decoder = handle<Decoder>()({
    number: decodeNumber,
    string: decodeString,
    boolean: decodeBoolean,
    literal: decodeLiteral,
    anyOf: decodeAnyOf,
    maybe: decodeMaybe,
    object: decodeObject,
    record: decodeRecord,
    array: decodeArray,
    tuple: decodeTuple,
    unionUnsafe: decodeUnionUnsafe,
    union: decodeUnion,
    intersect: decodeIntersect,
    any: decodeAny,
    never: decodeNever,
});

export const runDecoder = <T,>(handler: DecoderT<T>, json: Json): T => {
    return unpack(handler, json, new Context);
};