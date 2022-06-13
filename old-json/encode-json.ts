import { handle } from "../ft";
import { NonReferenceType, Json, checkType, TypeName } from "../lodash";

declare const type: unique symbol;
interface EncoderT<T> {
    [type]: T;
}
type EncoderR<T> = (value: T) => Json
const pack = <T,>(decoder: EncoderR<T>) => decoder as unknown as EncoderT<T>;
const unpack = <T,>(decoder: EncoderT<T>, value: T) => {
    return (decoder as unknown as EncoderR<T>)(value);
};
declare const Encoder: unique symbol;
type Encoder = typeof Encoder
declare module '../ft' {
    interface Hkt<T> {
        [Encoder]: EncoderT<T>
    }
}

export const encodeNumber = pack<number>((value) => value);
export const encodeString = pack<string>((value) => value);
export const encodeBoolean = pack<boolean>((value) => value);

export const encodeLiteral = <T extends NonReferenceType>() => {
    return pack<T>((value) => value);
};

export const encodeAnyOf = <T extends NonReferenceType[]>() => {
    return pack<T[number]>((value) => value);
}

export const encodeMaybe = <T,>(child: EncoderT<T>) => {
    return pack<T | undefined>((value) => {
        if (value === undefined) {
            throw new Error('Impossible');
        }
        return unpack(child, value);
    });
};

export const encodeObject = <O extends object>(children: { [K in keyof O]: EncoderT<O[K]> }) => {
    return pack<O>((value) => {
        const result: Record<string, Json> = {};
        for (const key in children) {
            const v = value[key];
            if (!checkType(v as any, TypeName.Undefined)) {
                result[key] = unpack(children[key], v);
            }
        }
        return result;
    });
};

export const encodeRecord = <K extends string, V>(key: EncoderT<K>, value: EncoderT<V>) => {
    return pack<Record<K, V>>((val) => {
        const result: Record<string, Json> = {};
        for (const k in val) {
            const kk = unpack(key, k);
            if (!checkType(kk, TypeName.String)) {
                throw new Error('Impossible');
            }
            result[kk] = unpack(value, val[k]);
        }
        return result;
    });
};

export const encodeArray = <T,>(child: EncoderT<T>) => {
    return pack<T[]>((value) => {
        return value.map((item) => unpack(child, item));
    });
};

interface ChainTuple<R extends any[]> {
    add: <T>(type: EncoderT<T>) => ChainTuple<[...R, T]>;
    end: EncoderT<R>;
}
const chainTuple = <R extends any[]>(
    length: number, 
    input: (value: R, result: Json[]) => void,
): ChainTuple<R> => {
    const add = <T,>(type: EncoderT<T>) => chainTuple<[...R, T]>(
        length + 1,
        (value, result) => {
            input(value as unknown as R, result);
            result[length] = unpack(type, value[length]);
        },
    );
    const end = pack<R>((value) => {
        const result = new Array<Json>(length);
        input(value, result);
        return result;
    });
    return {add, end};
};
export const encodeTuple = chainTuple<[]>(0, () => {});

interface ChainUnion<R extends {}> {
    add: <T, K extends string>(name: K, type: EncoderT<Exclude<T, R>>) => ChainUnion<R | { type: K, value: T }>;
    end: EncoderT<R>;
}
const createUnion = <R extends {}>(input: EncoderT<R>): ChainUnion<R> => {
    const add = <T, K extends string>(
        name: K,
        type: EncoderT<T>,
    ) => createUnion<R | { type: K, value: T }>(pack((value) => {
        // hasOwnProperty?
        if ('type' in value && value.type === name) {
            return unpack(type, value.value);
        } else {
            return unpack(input, value);
        }
    }));
    return {add, end: input};
};
export const encodeUnionUnsafe = createUnion<never>(pack(() => {
    throw new Error("Impossible");
}));

export const encodeUnion = <K extends string, O extends Record<string, object>>(
    discriminator: K,
    children: { [L in keyof O]: EncoderT<O[L]> }
) => {
    return pack<{ [L in keyof O]: { [M in K]: L } & O[L] }[keyof O]>((value) => {
        const v: O[keyof O] = value;
        return unpack(children[value[discriminator]], v);
    });
};

interface ChainIntersect<R extends object> {
    add: <T extends object>(type: EncoderT<T>) => ChainIntersect<R & T>;
    end: EncoderT<R>;
}
export const encodeIntersect = <R extends object>(input: EncoderT<R>): ChainIntersect<R> => {
    const add = <T extends object>(type: EncoderT<T>) => encodeIntersect<R & T>(pack((value) => {
        const a = unpack(input, value);
        const b = unpack(type, value);
        if (!checkType(a, TypeName.Object) || !checkType(b, TypeName.Object)) {
            throw new Error("Impossible");
        }
        return {...a, ...b};
    }));
    return {add, end: input};
};

export const encodeNever = pack<never>(() => {
    throw new Error("Impossible");
});


export const encoder = handle<Encoder>()({
    number: encodeNumber,
    string: encodeString,
    boolean: encodeBoolean,
    literal: encodeLiteral,
    anyOf: encodeAnyOf,
    maybe: encodeMaybe,
    object: encodeObject,
    record: encodeRecord,
    array: encodeArray,
    tuple: encodeTuple,
    unionUnsafe: encodeUnionUnsafe,
    union: encodeUnion,
    intersect: encodeIntersect,
    never: encodeNever,
});

export const runEncoder = <T,>(handler: EncoderT<T>, value: T): Json => {
    const result = unpack(handler, value);
    if (checkType(result, TypeName.Undefined)) {
        throw new Error("Impossible");
    }
    return result;
};