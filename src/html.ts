import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write, insertToArray } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export interface HtmlOptions {
    title: string,
    filename: string,
    template?: string
}

export function addHtml({ isDev, config, sourceFile }: Context, { title, filename, template }: HtmlOptions) {

    sourceFile.addImportDeclaration({
        namespaceImport: 'HtmlWebpackPlugin',
        moduleSpecifier: 'html-webpack-plugin'
    })

    addToArray(
        config.plugins,
        write(L('new HtmlWebpackPlugin('), {
            title,
            filename,
            ...(template && { template }),
            minify: ternary(isDev, false, {
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true
            })
        }, L(')'))
    )
}