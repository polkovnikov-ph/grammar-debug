export type Maybe<T> = T | undefined;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

export const isTruthy: <T,>(t: T | false | 0 | -0 | 0n | -0n | undefined | null | "") => t is T = Boolean as any;

export const toProperCase = (s: string) => s.substr(0, 1).toLowerCase() + s.substr(1);
export const toImproperCase = (s: string) => s.substr(0, 1).toUpperCase() + s.substr(1);

export const singleton = <K extends string, V>(key: K, value: V) => ({[key]: value} as Record<K, V>);

export const properIn = <K extends string, O>(key: K, object: O): key is K & keyof O => key in object;

export const keysOf = <O extends {}>(o: O) => Object.keys(o) as Extract<keyof O, string>[];

export const combine = (...eff: (() => void)[]) => () => eff.forEach(e => e());

export class Emitter<O extends Record<string, any[]>> {
    handlers: { [K in keyof O]?: Set<(...args: O[K]) => void> } = {};
    lastVal: { [K in keyof O]?: O[K] } = {};
    on = <K extends keyof O>(key: K, handler: (...args: O[K]) => void) => {
        (this.handlers[key] = this.handlers[key] || new Set)?.add(handler);
        const last: O[K] | undefined = this.lastVal[key];
        if (last) handler(...last);
        return () => this.off(key, handler);
    };
    off = <K extends keyof O>(key: K, handler: (...args: O[K]) => void) => {
        this.handlers[key]?.delete(handler);
    };
    emit = <K extends keyof O>(key: K, ...args: O[K]) => {
        this.lastVal[key] = args;
        this.handlers[key]?.forEach(handler => handler(...args));
    };
};

export type EnumKeys<Enum> = Exclude<keyof Enum, number>

export const enumObject = <Enum extends Record<string, number | string>>(e: Enum) => {
    const copy = {...e} as { [K in EnumKeys<Enum>]: Enum[K] };
    Object.values(e).forEach(value => typeof value === 'number' && delete copy[value]);
    return copy;
};

export const enumKeys = <Enum extends Record<string, number | string>>(e: Enum) => {
    return Object.keys(enumObject(e)) as EnumKeys<Enum>[];
};

export const enumValues = <Enum extends Record<string, number | string>>(e: Enum) => {
    return [...new Set(Object.values(enumObject(e)))] as Enum[EnumKeys<Enum>][];
};

export const flatMap = <A, B>(xs: A[], f: (x: A) => B[]): B[] => {
    return flatten(xs.map(f));
};

export const flatten = <A,>(xss: A[][]): A[] => {
    const empty: A[] = [];
    return empty.concat(...xss);
};

export const memo = <T extends object, R>(f: (arg: T) => R) => {
    const results = new Map<T, R>();
    return (arg: T): R => results.get(arg) || (() => {
        const value = f(arg);
        results.set(arg, value);
        return value;
    })();
};

// utilities to avoid using type name strings (as returned from `typeof`) all over the code
// they're not compressed by either of minifiers
export /**const*/ enum TypeName {
    Null,
    Boolean,
    Number,
    String,
    Array,
    Object,
    Undefined,
}

const MapTypeToTypeOf = {
    [TypeName.Null]: 'object',
    [TypeName.Boolean]: 'boolean',
    [TypeName.Number]: 'number',
    [TypeName.String]: 'string',
    [TypeName.Array]: 'object',
    [TypeName.Object]: 'object',
    [TypeName.Undefined]: 'undefined',
} as const;

export const typeNameToString = <K extends TypeName>(type: K): (typeof MapTypeToTypeOf)[K] => MapTypeToTypeOf[type];

export type TypeFromName = {
    [TypeName.Null]: null,
    [TypeName.Boolean]: boolean,
    [TypeName.Number]: number,
    [TypeName.String]: string,
    [TypeName.Array]: unknown[],
    [TypeName.Object]: Record<string, unknown>,
    [TypeName.Undefined]: undefined,
}

export const checkType = <K extends TypeName>(value: TypeFromName[TypeName], type: K): value is TypeFromName[K] => {
    const realType = typeof value;
    return realType !== 'object'
        ? realType === typeNameToString(type)
        : Array.isArray(value)
        ? type === TypeName.Array
        : value === null
        ? type === TypeName.Null
        : type === TypeName.Object
};

export type NonReferenceType = null | boolean | number | string