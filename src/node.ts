import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write, insertToArray } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export function addNode({ configObject }: Context) {

    insertToObject(0, configObject, {
        target: 'node',
        node: {
            __dirname: false
        },
        externals: [
            L(`// instead of search for node_modules folders and excluding every found module individually, just do this:
                function (context, request: string, callback: Function) {
if (/^\\w/.test(request)) {
return callback(null, 'commonjs ' + request);
}
callback();
}`)
        ]
    });
}