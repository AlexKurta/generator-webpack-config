import { ArrayLiteralExpression, SourceFile, FunctionExpression, VariableStatementStructure, VariableDeclarationKind } from "ts-simple-ast";
import { addToArray, ternary, L, and, write } from "../../utils";
import * as Generator from 'yeoman-generator';
import * as path from 'path';
import { AugmentModule, Extension } from "../../common/augmentModule";
import { Prompt, confirmPrompt } from "../../common/prompt";

declare global {
    interface Options {
        cssfilename?: string;
        extractcss?: boolean,
    }
    interface Config {
        cssModules?: boolean;
        tsdecl?: boolean;
    }
}

const CSS_DECL_FILENAME = 'cssModules.d.ts';

export default class implements Extension {

    prompts() {
        const prompts: Prompt<keyof Config>[] = [
            confirmPrompt<'cssModules'>({
                when: (resp) => {
                    return resp.type === 'web';
                },
                name: 'cssModules',
                default: true,
                message: 'Use CSS modules?'
            }),
            confirmPrompt<'tsdecl'>({
                when: (resp) => {
                    return resp.ts && resp.cssModules;
                },
                name: 'tsdecl',
                default: true,
                message: `Create TypeScript declaration file for *.css, *.scss and *.sass imports? This is required for working css modules. You will have to make sure your tsconfig.json includes this file in its configuration. It will be named \'${CSS_DECL_FILENAME}\'.`
            }),
        ];

        return prompts;
    }

    AugmentModule = class extends AugmentModule {

        augment() {
            const { type, cssModules, ts: ts2, tsdecl } = this.config;

            if (type !== 'web') return;

            const { extractcss, cssfilename } = this.options;

            const ts = !!cssModules && !!ts2;

            const useCssExtractPlugin = 'useCssExtractPlugin';

            const useTsModuleLoader = ts && cssModules;
            this.insertVariableStatement({
                declarationKind: VariableDeclarationKind.Const,
                declarations: [{
                    name: useCssExtractPlugin,
                    initializer: typeof extractcss === 'boolean' ? extractcss.toString() : `!${this.isDev}`
                }]
            });

            if (useTsModuleLoader && tsdecl) {
                this.gen.fs.write(this.gen.destinationPath(CSS_DECL_FILENAME), this.gen.fs.read(this.gen.templatePath(CSS_DECL_FILENAME)));
            }

            const cssLoaderModuleOptions = {
                camelCase: true,
                modules: cssModules,
                localIdentName: '[local]--[hash:base64:5]' // todo indentname
            }

            this.addRules(
                {
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
    ].concat(${this.isDev} ? [] : [require('cssnano')()])`)
                            }
                        },
                        'sass-loader'
                    ]
                })

            this.addImportDeclaration({
                namespaceImport: 'MiniCssExtractPlugin',
                moduleSpecifier: 'mini-css-extract-plugin'
            })
            this.addPlugins(
                and(useCssExtractPlugin, write(L('new MiniCssExtractPlugin('), {
                    filename: cssfilename || ternary(this.isDev, '[name].css', '[name].[hash].css'),
                    chunkFilename: ternary(this.isDev, '[id].css', '[id].[hash].css')
                }, L(')')))
            )

            if (useTsModuleLoader) {
                this.addImportDeclaration({
                    namespaceImport: 'webpack',
                    moduleSpecifier: 'webpack'
                })
                this.addPlugins(
                    write(L('new webpack.WatchIgnorePlugin('), [/\.(sa|sc|c)ss\.d\.ts$/i], L(')'))
                )
            }
        }
    }
}