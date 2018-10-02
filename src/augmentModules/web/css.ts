import { ArrayLiteralExpression, SourceFile, FunctionExpression, VariableStatementStructure, VariableDeclarationKind } from "ts-simple-ast";
import { addToArray, ternary, L, and, write, Literal } from "../../utils";
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
        createTsCssDeclarationFile?: boolean;
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
            confirmPrompt<'createTsCssDeclarationFile'>({
                when: (resp) => {
                    return resp.ts && resp.cssModules;
                },
                name: 'createTsCssDeclarationFile',
                default: true,
                message: `Create TypeScript declaration file for *.css, *.scss and *.sass imports? This is required for working css modules. You will have to make sure your tsconfig.json includes this file in its configuration. It will be named \'${CSS_DECL_FILENAME}\'.`
            }),
        ];

        return prompts;
    }

    AugmentModule = class extends AugmentModule {

        augment() {
            const { type, cssModules, ts, createTsCssDeclarationFile } = this.config;

            if (type !== 'web') return;

            const { extractcss } = this.options;

            let styleLoaderExpr: any;
            if (typeof extractcss === 'undefined') {
                this.addExtractPluginImport();

                const extractCssVarName = 'useCssExtractPlugin';
                this.insertVariableStatement([{
                    name: extractCssVarName,
                    initializer: `!${this.isDev}`
                }]);

                this.addPlugins(and(extractCssVarName, this.getNewExtractPluginText()));

                styleLoaderExpr = ternary(extractCssVarName, L('MiniCssExtractPlugin.loader'), 'style-loader');

            } else if (extractcss) {
                this.addExtractPluginImport();

                this.addPlugins(this.getNewExtractPluginText());

                styleLoaderExpr = L('MiniCssExtractPlugin.loader');
            } else {
                styleLoaderExpr = 'style-loader';
            }

            if (createTsCssDeclarationFile) {
                this.gen.fs.write(this.gen.destinationPath(CSS_DECL_FILENAME), this.gen.fs.read(this.gen.templatePath(CSS_DECL_FILENAME)));
            }

            const tsCssModules = ts && cssModules;

            if (tsCssModules) {
                this.addPlugins(
                    write(L('new webpack.WatchIgnorePlugin('), [/\.(sa|sc|c)ss\.d\.ts$/i], L(')'))
                )
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
                        styleLoaderExpr,
                        tsCssModules
                            ? {
                                loader: "typings-for-css-modules-loader",
                                options: {
                                    namedExport: true,
                                    ...cssLoaderModuleOptions
                                }
                            }
                            : cssModules
                                ? {
                                    loader: 'css-loader',
                                    options: cssLoaderModuleOptions
                                }
                                : 'css-loader',
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
        }

        private addExtractPluginImport() {
            this.addImportDeclaration({
                namespaceImport: 'MiniCssExtractPlugin',
                moduleSpecifier: 'mini-css-extract-plugin'
            })
        }

        private getNewExtractPluginText() {
            const { cssfilename } = this.options;

            return write(L('new MiniCssExtractPlugin('), {
                filename: cssfilename || ternary(this.isDev, '[name].css', '[name].[hash].css'),
                chunkFilename: ternary(this.isDev, '[id].css', '[id].[hash].css')
            }, L(')'))
        }
    }
}