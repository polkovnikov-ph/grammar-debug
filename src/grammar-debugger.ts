import { singleton } from "./lodash";
import { Grammar1 } from "./grammar-runtime";

type Context = {
    s: string;
    p: number;
    l: number;
    sp: [number, number],
}
interface PosStep { type: 'pos', from: number; to: number; }
interface MoveStep { type: 'move', pos: number }
interface InStep { type: 'in', name: string }
interface OutStep { type: 'out' }
type Step = PosStep | MoveStep | InStep | OutStep
declare const FailVT: unique symbol;
type Fail = typeof FailVT
const Fail: Fail = {fail: true} as unknown as Fail;
type DebuggerT<T> = (ctx: Context) => Generator<Step, T | Fail, void>
declare const DebuggerTag: unique symbol;
type Debugger = typeof DebuggerTag
declare module './ft' {
    interface Hkt<T> {
        [DebuggerTag]: DebuggerT<T>
    }
}
export const debuggr: Grammar1<Debugger, Debugger> = {
    string: (value) => {
        const l = value.length;
        return function*(c) {
            // yield c.sp;
            const v = c.s.substr(c.p, l);
            if (c.p < c.l && v === value) {
                c.p += l;
                yield {type: 'move', pos: c.p};
                return value;
            } else {
                return Fail;
            }
        };
    },
    klass: (value) => {
        const r = new RegExp(`[${value}]`);
        return function*(c) {
            // yield c.sp;
            const x = c.s[c.p];
            if (c.p < c.l && x.match(r)) {
                ++c.p;
                yield {type: 'move', pos: c.p};
                return x;
            } else {
                return Fail;
            }
        };
    },
    stringy: (child) => function*(c) {
        const pos = c.p;
        const res = yield* child(c);
        return res === Fail ? Fail : c.s.substring(pos, c.p);
    },
    maybe: (child) => function*(c) {
        const pos = c.p;
        const res = yield* child(c);
        if (res === Fail) {
            c.p = pos;
            yield {type: 'move', pos: c.p};
            return undefined;
        }
        return res;
    },
    some: <T>(child: DebuggerT<T>) => function*(c) {
        const parts: T[] = [];
        for (;;) {
            const pos = c.p;
            const res = yield* child(c);
            if (res === Fail) {
                c.p = pos;
                yield {type: 'move', pos: c.p};
                return parts;
            }
            parts.push(res);
        }
    },
    many: <T>(child: DebuggerT<T>) => function*(c) {
        const parts: T[] = [];
        const res = yield* child(c);
        if (res === Fail) {
            return Fail;
        }
        parts.push(res);
        for (;;) {
            const pos = c.p;
            const res = yield* child(c);
            if (res === Fail) {
                c.p = pos;
                yield {type: 'move', pos: c.p};
                return parts;
            }
            parts.push(res);
        }
    },
    call: (_name, child) => function*(c) {
        // yield c.sp;
        return yield* child()(c);
    },
    one: function*(c) { return {} },
    seq0: (prev, next) => function*(c) {
        const res = yield* prev(c);
        return res === Fail || (yield* next(c)) === Fail ? Fail : res;
    },
    seq1: (prev, name, next) => function*(c) {
        const res1 = yield* prev(c);
        if (res1 === Fail) {
            return Fail;
        }
        const res2 = yield* next(c);
        if (res2 === Fail) {
            return Fail;
        }
        return {...res1, ...singleton(name, res2)};
    },
    zero: function*(c) { return Fail; },
    sel: (prev, next) => function*(c) {
        const pos = c.p;
        const res = yield* prev(c);
        if (res !== Fail) {
            return res;
        }
        c.p = pos;
        yield {type: 'move', pos: c.p};
        return yield* next(c);
    },
    tagged: (name, child) => function*(c) {
        const from = c.p;
        yield {type: 'in', name};
        const res = yield* child(c);
        yield {type: 'out'};
        if (res === Fail) {
            return Fail;
        }
        return {type: name, ...res, $from: from, $to: c.p};
    },
    untagged: (_name, child) => c => child(c),
    pos: (from, to, child) => function*(c) {
        // const psp = c.sp;
        // c.sp = [from, to];
        yield {type: 'pos', from, to};
        const res = yield* child(c);
        // c.sp = psp;
        return res;
    }
};

export const debug = function*<T>(
    inter: DebuggerT<T>,
    text: string,
) {
    const c: Context = {
        s: text,
        p: 0,
        l: text.length,
        sp: [0, 0],
    };
    const res = yield* inter(c);
    if (res === Fail || c.p !== c.l) {
        throw new Error("Parse failed");
    }
    return res;
};