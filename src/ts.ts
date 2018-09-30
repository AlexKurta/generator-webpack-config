import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write, insertToArray } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export interface TsOptions {
    tsConfig?: string;
}

export function addTs({ config, configObject }: Context, { tsConfig }: TsOptions) {

    const exts = getNestedPropertyValue<ArrayLiteralExpression>(configObject, ['resolve', 'extensions']);

    insertToArray(
        0,
        exts,
        '.ts',
        '.tsx'
    )

    addToArray(
        config.rules,
        {
            test: /\.tsx?$/i,
            loader: 'ts-loader',
            ...(tsConfig && {
                options: {
                    configFile: tsConfig
                }
            })
        }
    )
}