import { flatMap } from "./lodash";

export class MergedError extends Error {
    private errors: Error[];
    constructor(...errors: Error[]) {
        super('');
        this.errors = flatMap(errors, error => (
            error instanceof MergedError ? error.errors : [error]
        ));
        const messages = this.errors.map(error => error.message).join('\n')
            .split('\n').map(row => '\t' + row).join('\n');
        this.message = `Neither option worked:\n${messages}`;
    }
}
