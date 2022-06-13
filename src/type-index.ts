import { jsonReader, jsonWriter } from './type-json';
import { inspect } from 'util';
import * as x from './type-test';

const value = x.bar('1');

console.log(inspect(value, {
    depth: null,
    colors: true,
}));

const result = x.Foo(jsonReader)(x.Foo(jsonWriter)(value));

console.log(inspect(result, {
    depth: null,
    colors: true,
}));