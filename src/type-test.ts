import * as m from './type-runtime';
import * as l from './lodash';
import * as f from './ft';
export interface Bar {
    type: 'Bar';
    bar: string;
}
export interface Baz {
    type: 'Baz';
    baz: number;
}
export type Foo = Bar | Baz;
export const bar = (bar: string): Bar => ({
    type: 'Bar',
    bar,
});
export const baz = (baz: number): Baz => ({
    type: 'Baz',
    baz,
});
export const Foo = l.memo(
    <T extends f.TypeTag, C extends f.TypeTag, D extends f.TypeTag>(
        f: m.TypeMeta1<T, C, D>,
    ): f.Apply<D, Foo> =>
        f.typeDef('Foo', {
            Bar: f.field(f.nil, 'bar', f.string),
            Baz: f.field(f.nil, 'baz', f.number),
        }),
);

