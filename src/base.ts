import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export interface BaseOptions {
    entry: string;
    outFileName: string;
    outSingle?: string;
    outProd?: string;
    outDev?: string;
    stats?: string;
}

export function base({ isDev, config, sourceFile, insertVariableStatement, configObject }: Context, { entry, outFileName, outSingle, outDev, outProd, stats }: BaseOptions) {

    const outDir = 'outDir';

    insertVariableStatement({
        declarations: [
            {
                name: isDev,
                initializer: "argv.mode === 'development'"
            },
            {
                name: outDir,
                initializer: outSingle ? `'${outSingle}'` : ternary(isDev, outDev, outProd).text
            }]
    })

    insertToObject(0, configObject, {
        entry,
        output: {
            path: L(`path.resolve(__dirname, ${outDir})`),
            filename: outFileName
        },
        ...(stats && { stats })
    });

    insertToObject(0, configObject, {
        devtool: ternary(isDev, "eval-source-map", 'nosources-source-map')
    })

    sourceFile.addImportDeclaration({
        namespaceImport: 'CleanWebpackPlugin',
        moduleSpecifier: 'clean-webpack-plugin'
    })

    addToArray(
        config.plugins,
        write(L(`new CleanWebpackPlugin(${outDir}, { verbose: false })`))
    )
}