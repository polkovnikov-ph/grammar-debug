import { singleton } from "./lodash";
import { Grammar1 } from "./grammar-runtime";

type Context = {
    s: string;
    p: number;
    l: number;
}
declare const FailVT: unique symbol;
type Fail = typeof FailVT
const Fail: Fail = {fail: true} as unknown as Fail;
type InterpretT<T> = (ctx: Context) => T | Fail
declare const InterpretTag: unique symbol;
export type Interpret = typeof InterpretTag
declare module './ft' {
    interface Hkt<T> {
        [InterpretTag]: InterpretT<T>
    }
}
export const interpreter: Grammar1<Interpret, Interpret> = {
    string: (value) => {
        const l = value.length;
        return c => {
            const v = c.s.substr(c.p, l);
            if (c.p < c.l && v === value) {
                c.p += l;
                return value;
            } else {
                return Fail;
            }
        };
    },
    klass: (value) => {
        const r = new RegExp(`[${value}]`);
        return c => {
            const x = c.s[c.p];
            if (c.p < c.l && x.match(r)) {
                ++c.p;
                return x;
            } else {
                return Fail;
            }
        };
    },
    stringy: (child) => c => {
        const pos = c.p;
        const res = child(c);
        return res === Fail ? Fail : c.s.substring(pos, c.p);
    },
    maybe: (child) => c => {
        const pos = c.p;
        const res = child(c);
        if (res === Fail) {
            c.p = pos;
            return undefined;
        }
        return res;
    },
    some: <T>(child: InterpretT<T>) => c => {
        const parts: T[] = [];
        for (;;) {
            const pos = c.p;
            const res = child(c);
            if (res === Fail) {
                c.p = pos;
                return parts;
            }
            parts.push(res);
        }
    },
    many: <T>(child: InterpretT<T>) => c => {
        const parts: T[] = [];
        const res = child(c);
        if (res === Fail) {
            return Fail;
        }
        parts.push(res);
        for (;;) {
            const pos = c.p;
            const res = child(c);
            if (res === Fail) {
                c.p = pos;
                return parts;
            }
            parts.push(res);
        }
    },
    call: (_name, child) => c => child()(c),
    one: () => ({}),
    seq0: (prev, next) => c => {
        const res = prev(c);
        return res === Fail || next(c) === Fail ? Fail : res;
    },
    seq1: (prev, name, next) => c => {
        const res1 = prev(c);
        if (res1 === Fail) {
            return Fail;
        }
        const res2 = next(c);
        if (res2 === Fail) {
            return Fail;
        }
        return {...res1, ...singleton(name, res2)};
    },
    zero: () => Fail,
    sel: (prev, next) => c => {
        const pos = c.p;
        const res = prev(c);
        if (res !== Fail) {
            return res;
        }
        c.p = pos;
        return next(c);
    },
    tagged: (name, child) => c => {
        const from = c.p;
        const res = child(c);
        if (res === Fail) {
            return Fail;
        }
        return {type: name, ...res, $from: from, $to: c.p};
    },
    untagged: (_name, child) => c => child(c),
    pos: (_from, _to, child) => c => child(c),
};

export const interpret = <T>(
    inter: InterpretT<T>,
    text: string,
) => {
    const c: Context = {
        s: text,
        p: 0,
        l: text.length,
    };
    const res = inter(c);
    if (res === Fail || c.p !== c.l) {
        throw new Error("Parse failed");
    }
    return res;
};