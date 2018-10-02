import { ternary, L, write } from "../../utils";
import { AugmentModule, Extension } from "../../common/augmentModule";
import { Prompt, confirmPrompt, inputPrompt } from "../../common/prompt";

declare global {
    interface Config {
        html?: boolean;
        htmlTitle?: string;
        htmlFilename?: string;
        htmlTemplate?: string;
    }
}

export default class implements Extension {
    prompts() {
        const prompts: Prompt<keyof Config>[] = [
            confirmPrompt<'html'>({
                when: (resp) => {
                    return resp.type === 'web';
                },
                name: 'html',
                default: true,
                message: 'Create html file? Scripts and style sheets will automatically be inserted into this file.'
            }),
            inputPrompt<'htmlTitle'>({
                when: (resp) => {
                    return resp.html;
                },
                name: 'htmlTitle',
                default: 'Webpack App',
                message: '(html) Title'
            }),
            inputPrompt<'htmlFilename'>({
                when: (resp) => {
                    return resp.html;
                },
                name: 'htmlFilename',
                default: 'index.html',
                message: '(html) Output file'
            }),
            inputPrompt<'htmlTemplate'>({
                when: (resp) => {
                    return resp.html;
                },
                filter: (input) => {
                    return input.trim() || undefined;
                },
                name: 'htmlTemplate',
                message: '(html) Template file (will create a standard html file if not specified)'
            })
        ]

        return prompts;
    }

    AugmentModule = class extends AugmentModule {

        augment(): void {
            const { type, html, htmlTitle, htmlFilename, htmlTemplate } = this.config;

            if (type !== 'web') return;

            if (!html) return;

            this.addImportDeclaration({
                namespaceImport: 'HtmlWebpackPlugin',
                moduleSpecifier: 'html-webpack-plugin'
            })

            this.addPlugins(
                write(L('new HtmlWebpackPlugin('), {
                    title: htmlTitle,
                    filename: htmlFilename,
                    ...(htmlTemplate && { template: htmlTemplate }),
                    minify: ternary(this.isDev, false, {
                        collapseWhitespace: true,
                        collapseInlineTagWhitespace: true,
                        removeComments: true,
                        removeRedundantAttributes: true
                    })
                }, L(')'))
            )
        }
    }
}