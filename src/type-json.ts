import { Json, properIn, singleton } from './lodash';
import * as m from './type-runtime';

type ToJsonT<T> = (value: T) => Json
type ToJson1T<T> = (value: T) => Record<string, Json>
type FromJsonT<T> = (json: Json) => T
declare const ToJsonTag: unique symbol;
declare const ToJson1Tag: unique symbol;
declare const FromJsonTag: unique symbol;
type ToJson = typeof ToJsonTag
type ToJson1 = typeof ToJson1Tag
type FromJson = typeof FromJsonTag
declare module './ft' {
    interface Hkt<T> {
        [ToJsonTag]: ToJsonT<T>;
        [ToJson1Tag]: ToJson1T<T>;
        [FromJsonTag]: FromJsonT<T>;
    }
}

export const jsonWriter: m.TypeMeta1<ToJson, ToJson1, ToJson> = ({
    ref: (_name, typeDef) => value => typeDef()(value),
    number: (v) => v,
    array: (c) => (v) => v.map(c),
    string: (v) => v,
    nil: () => ({}),
    field: (l, n, r) => (v) => ({...l(v), [n]: r(v[n])}),
    typeDef: (_name, children) => (v) => ({type: v.type, ...children[v.type](v)}),
});

export const jsonReader: m.TypeMeta1<FromJson, FromJson, FromJson> = {
    ref: (_name, typeDef) => value => typeDef()(value),
    number: (v) => {
        if (typeof v !== 'number') throw 42;
        return v;
    },
    array: (c) => (v) => {
        if (typeof v !== 'object' || v === null || !Array.isArray(v)) throw 42;
        return v.map(c);
    },
    string: (v) => {
        if (typeof v !== 'string') throw 42;
        return v;
    },
    nil: () => ({}),
    field: (l, n, r) => (v) => {
        if (typeof v !== 'object' || v === null || Array.isArray(v)) throw 42;
        return {...l(v), ...singleton(n, r(v[n]))};
    },
    typeDef: (_name, children) => (v) => {
        if (typeof v !== 'object' || v === null || !('type' in v)) throw 42;
        const {type} = v;
        if (typeof type !== 'string' || !properIn(type, children)) throw 42;
        return {...singleton('type', type), ...children[type](v)};
    },
};