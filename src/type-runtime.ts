import { Apply, TypeTag } from "./ft";

export interface Type<T> {
    string: T;
    number: T;
    array: (type: T) => T;
    maybe: (type: T) => T;
    ref: (name: string) => T;
}
export interface Iface<T, I> {
    iface: (name: string, fields: Record<string, T>) => I;
}
export interface Union<T, I> {
    union: (name: string, options: T[]) => I;
}

// export interface Type<TypeDef_, Type_> {
//     number: Type_;
//     string: Type_;
//     array: (child: Type_) => Type_;
//     ref: (name: string, typeDef: () => TypeDef_) => Type_;
// }
// export interface Cons<Type_, Cons_> {
//     nil: Cons_;
//     field: (left: Cons_, name: string, right: Type_) => Cons_;
// }
// export interface TypeDef<Cons_, TypeDef_> {
//     typeDef: (name: string, child: Record<string, Cons_>) => TypeDef_;
// }
// export type TypeMeta<Type_, Cons_, TypeDef_> = TypeDef<Cons_, TypeDef_> & Cons<Type_, Cons_> & Type<TypeDef_, Type_>

export interface Type1<TypeDef_ extends TypeTag, Type_ extends TypeTag> {
    number: Apply<Type_, number>;
    string: Apply<Type_, string>;
    array: <T>(
        child: Apply<Type_, T>,
    ) => Apply<Type_, T[]>;
    ref: <T>(
        name: string, 
        typeDef: () => Apply<TypeDef_, T>,
    ) => Apply<Type_, T>;
}
export interface Cons1<Type_ extends TypeTag, Cons_ extends TypeTag> {
    nil: Apply<Cons_, {}>;
    field: <T extends object, K extends string, U>(
        left: Apply<Cons_, T>, 
        name: K,
        right: Apply<Type_, U>,
    ) => Apply<Cons_, T & { [KK in K]: U }>;
}
export interface TypeDef1<Cons_ extends TypeTag, TypeDef_ extends TypeTag> {
    typeDef: <K extends string, O extends Record<string, object>>(
        name: K,
        child: { [K in keyof O]: Apply<Cons_, O[K]> }
    ) => Apply<TypeDef_, {
        [K in keyof O & string]: {type: K} & O[K]
    }[keyof O & string]>;
}
export type TypeMeta1<
    T extends TypeTag,
    C extends TypeTag,
    D extends TypeTag,
> = 
    & TypeDef1<C, D>
    & Cons1<T, C>
    & Type1<D, T>