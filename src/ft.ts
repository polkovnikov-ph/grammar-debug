declare const fake1: unique symbol;
declare const fake2: unique symbol;

export interface Hkt<T> {
    [fake1]: unknown;
    [fake2]: unknown;
}

export type TypeTag = keyof Hkt<any>

export type Apply<F extends TypeTag, T> = Hkt<T>[F]


declare const fake3: unique symbol;
declare const fake4: unique symbol;

export interface Term<F extends TypeTag> {
    [fake3]: unknown;
    [fake4]: unknown;
}

export type TermTag = keyof Term<any>

export type ApplyTerm<F extends TermTag, T extends TypeTag> = Term<T>[F]


declare const result: unique symbol;
declare const tags: unique symbol;

export interface Expression<Result, Tags extends TermTag> {
    [result]: Result;
    [tags]: (tags: Tags) => void;
}

export const define = <Result, Tags extends TermTag>(
    f: <F extends TypeTag>(
        alg: Pick<Term<F>, Tags>,
    ) => Apply<F, Result>
): Expression<Result, Tags> => f as any;

export const apply = <Result, Tags extends TermTag, F extends TypeTag>(
    value: Expression<Result, Tags>, 
    alg: Pick<Term<F>, Tags>,
): Apply<F, Result> => (value as any)(alg);

export const handle = <T extends TypeTag>() => {
    return <K extends keyof Term<T>>(o: Pick<Term<T>, K>): Pick<Term<T>, K> => o;
};