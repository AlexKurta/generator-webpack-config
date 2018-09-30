import { ArrayLiteralExpression, SourceFile, FunctionExpression, VariableStatementStructure } from "ts-simple-ast";
import { addToArray, ternary, L, and, write } from "./utils";
import * as Generator from 'yeoman-generator';
import * as path from 'path';
import { VariableStatement } from "typescript";
import { Context } from "./context";

export interface AddCssOptions {
    modules: false | { ts: false | { createTypings: boolean; } };
    cssFileName?: string;
    extractCss?: boolean;
}

export function addCss({ isDev, installModules, config, sourceFile, insertVariableStatement }: Context, { modules, cssFileName, extractCss }: AddCssOptions) {

    const cssdeclfilename = 'cssModules.d.ts';
    const cssModules = !!modules;
    const ts = !!modules && !!modules.ts;
    const tsdecl = !!modules && !!modules.ts && modules.ts.createTypings;

    const useCssExtractPlugin = 'useCssExtractPlugin';

    const useTsModuleLoader = ts && cssModules;
    insertVariableStatement({
        declarations: [{
            name: useCssExtractPlugin,
            initializer: typeof extractCss === 'boolean' ? extractCss.toString() : `!${isDev}`
        }]
    });

    if (useTsModuleLoader && tsdecl) {
        this.fs.write(this.destinationPath(cssdeclfilename), this.fs.read(path.resolve(__dirname, '..', 'webpack-template', cssdeclfilename)));
    }

    installModules.add('postcss-import');
    installModules.add('postcss-preset-env');
    installModules.add('cssnano');

    const cssLoaderModuleOptions = {
        camelCase: true,
        modules: cssModules,
        localIdentName: '[local]--[hash:base64:5]' // todo indentname
    }

    addToArray(config.rules, {
        test: /\.(sa|sc|c)ss$/i,
        use: [
            ternary(useCssExtractPlugin, L('MiniCssExtractPlugin.loader'), 'style-loader'),
            useTsModuleLoader
                ? {
                    loader: "typings-for-css-modules-loader",
                    options: {
                        namedExport: true,
                        ...cssLoaderModuleOptions
                    }
                }
                : cssModules ? {
                    loader: 'css-loader',
                    options: cssLoaderModuleOptions
                } : 'css-loader',
            {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: L(`(loader: any) => [
require('postcss-import')({ root: loader.resourcePath }),
require('postcss-preset-env')()
].concat(${isDev} ? [] : [require('cssnano')()])`)
                }
            },
            'sass-loader'
        ]
    })

    sourceFile.addImportDeclaration({
        namespaceImport: 'MiniCssExtractPlugin',
        moduleSpecifier: 'mini-css-extract-plugin'
    })
    addToArray(
        config.plugins,
        and(useCssExtractPlugin, write(L('new MiniCssExtractPlugin('), {
            filename: cssFileName || ternary(isDev, '[name].css', '[name].[hash].css'),
            chunkFilename: ternary(isDev, '[id].css', '[id].[hash].css')
        }, L(')')))
    )

    if (useTsModuleLoader) {
        sourceFile.addImportDeclaration({
            namespaceImport: 'webpack',
            moduleSpecifier: 'webpack'
        })
        addToArray(
            config.plugins,
            write(L('new webpack.WatchIgnorePlugin('), [/\.(sa|sc|c)ss\.d\.ts$/i], L(')'))
        )
    }
}