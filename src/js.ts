import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write, insertToArray } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export function addJs({ config }: Context) {

    addToArray(
        config.rules,
        {
            test: /\.m?js$/i,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }
        }
    )
}