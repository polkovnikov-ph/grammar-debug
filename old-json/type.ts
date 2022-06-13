import { Apply, apply, Expression, define, TypeTag, TermTag, Term } from "../ft";
import { enumValues } from "../lodash";

export type NonReferenceType = null | boolean | number | string;

export const number = define<number, 'number'>(({number}) => number);
export const string = define<string, 'string'>(({string}) => string);
export const boolean = define<boolean, 'boolean'>(({boolean}) => boolean);
export const literal = <T extends NonReferenceType>(
    value: T,
): Expression<T, 'literal'> => define(({literal}) => (
    literal(value)
));
export const anyOf = <T extends NonReferenceType[]>(
    ...values: T
): Expression<T[number], 'anyOf'> => define(({anyOf}) => (
    anyOf(...values)
));
export const maybe = <T, F extends TermTag>(
    child: Expression<T, F>,
): Expression<T | undefined, F | 'maybe'> => define((alg) => (
    alg.maybe(apply(child, alg))
));
export const object = <T extends object, FS extends Record<string, TermTag>>(
    children: { [K in keyof T]: Expression<T[K], any> } & { [K in keyof FS]: Expression<any, FS[K]> }
) : Expression<T, FS[keyof FS] | 'object'> => define((alg) => {
    const mapped = {} as any;
    for (const key in children) {
        mapped[key] = apply(children[key], alg);
    }
    return alg.object(mapped);
});
export const record = <K extends string, V, F1 extends TermTag, F2 extends TermTag>(
    key: Expression<K, F1>,
    value: Expression<V, F2>,
): Expression<Record<K, V>, F1 | F2 | 'record'> => define((alg) => (
    alg.record(apply(key, alg), apply(value, alg))
));
export const array = <T, F extends TermTag>(
    child: Expression<T, F>,
): Expression<T[], F | 'array'> => define((alg) => (
    alg.array(apply(child, alg))
));
export const union = <K extends string, O extends Record<string, object>, FS extends Record<string, TermTag>>(
    discriminator: K, 
    children: { [L in keyof O]: Expression<O[L], any>; } &
        { [L in keyof FS]: Expression<any, FS[L]>; },
): Expression<{ [L in keyof O]: { [M in K]: L } & O[L]; }[keyof O], FS[keyof FS] | 'union'> => define((alg) => {
    const mapped = {} as any;
    for (const key in children) {
        mapped[key] = apply(children[key], alg);
    }
    return alg.union(discriminator, mapped);
});
interface ChainIntersect<R extends object, F extends TypeTag> {
    add: <T extends object>(type: Apply<F, T>) => ChainIntersect<R & T, F>;
    end: Apply<F, R>;
}
interface ChainIntersect2<R extends object, FS extends TermTag> {
    add: <T extends object, F extends TermTag>(type: Expression<T, F>) => ChainIntersect2<R & T, FS | F>;
    end: Expression<R, FS>;
}
const chainIntersect = <R extends object, F1 extends TermTag>(
    input: <F extends TypeTag>(alg: Pick<Term<F>, F1>) => ChainIntersect<R, F>,
): ChainIntersect2<R, F1> => ({
    add: <T extends object, F2 extends TermTag>(type: Expression<T, F2>): ChainIntersect2<R & T, F1 | F2> => (
        chainIntersect(alg => input(alg).add(apply(type, alg)))
    ),
    end: define((alg) => input(alg).end),
});
export const intersect = {
    add: <T extends object, F extends TermTag>(input: Expression<T, F>): ChainIntersect2<T, F | 'intersect'> => (
        chainIntersect(alg => alg.intersect(apply(input, alg)))
    ),
};
interface ChainUnion<R extends object, F extends TypeTag> {
    add: <T, K extends string>(name: K, type: Apply<F, Exclude<T, R>>) => ChainUnion<R | { type: K, value: T }, F>;
    end: Apply<F, R>;
}
interface ChainUnion2<R extends object, FS extends TermTag> {
    add: <K extends string, T, F extends TermTag>(name: K, type: Expression<Exclude<T, R>, F>) => ChainUnion2<R | { type: K, value: T }, FS | F>;
    end: Expression<R, FS>;
}
const chainUnion = <R extends object, F1 extends TermTag>(
    input: <F extends TypeTag>(alg: Pick<Term<F>, F1>) => ChainUnion<R, F>,
): ChainUnion2<R, F1> => ({
    add: <K extends string, T, F2 extends TermTag>(
        name: K,
        type: Expression<Exclude<T, R>, F2>,
    ): ChainUnion2<R | { type: K, value: T }, F1 | F2> => (
        chainUnion(alg => input(alg).add(name, apply(type, alg)))
    ),
    end: define((alg) => input(alg).end),
});
export const unionUnsafe = {
    add: <K extends string, T, F extends TermTag>(name: K, input: Expression<T, F>): ChainUnion2<{ type: K, value: T }, F | 'unionUnsafe'> => (
        chainUnion(alg => alg.unionUnsafe.add(name, apply(input, alg)))
    ),
};
interface ChainTuple<R extends any[], F extends TypeTag> {
    add: <T>(type: Apply<F, T>) => ChainTuple<[...R, T], F>;
    end: Apply<F, R>;
}
interface ChainTuple2<R extends any[], FS extends TermTag> {
    add: <T, F extends TermTag>(type: Expression<T, F>) => ChainTuple2<[...R, T], FS | F>;
    end: Expression<R, FS>;
}
const chainTuple = <R extends any[], F1 extends TermTag>(
    input: <F extends TypeTag>(alg: Pick<Term<F>, F1>) => ChainTuple<R, F>,
): ChainTuple2<R, F1> => ({
    add: <T, F2 extends TermTag>(type: Expression<T, F2>): ChainTuple2<[...R, T], F1 | F2> => (
        chainTuple(alg => input(alg).add(apply(type, alg)))
    ),
    end: define((alg) => input(alg).end),
});
export const tuple = chainTuple<[], 'tuple'>(alg => alg.tuple);
export const any = define<unknown, 'any'>(({any}) => any);
export const never = define<never, 'never'>(({never}) => never);

export const nativeEnum = <Enum extends Record<string, string | number>>(e: Enum) => anyOf(...enumValues(e));

declare module './ft' {
    export interface Term<F extends TypeTag> {
        number: Apply<F, number>;
        string: Apply<F, string>;
        boolean: Apply<F, boolean>;
        literal: <T extends NonReferenceType>(value: T) => Apply<F, T>
        anyOf: <T extends NonReferenceType[]>(...values: T) => Apply<F, T[number]>
        maybe: <T>(child: Apply<F, T>) => Apply<F, T | undefined>
        object: <O extends object>(children: { [K in keyof O]: Apply<F, O[K]>; }) => Apply<F, O>
        record: <K extends string, V>(key: Apply<F, K>, value: Apply<F, V>) => Apply<F, Record<K, V>>
        array: <T>(child: Apply<F, T>) => Apply<F, T[]>
        union: <K extends string, O extends Record<string, object>>(
            discriminator: K, 
            children: { [L in keyof O]: Apply<F, O[L]>; },
        ) => Apply<F, { [L in keyof O]: { [M in K]: L; } & O[L]; }[keyof O]>
        tuple: ChainTuple<[], F>
        unionUnsafe: ChainUnion<never, F>
        intersect: <T extends {}>(type: Apply<F, T>) => ChainIntersect<T, F>
        any: Apply<F, unknown>
        never: Apply<F, never>
    }
}