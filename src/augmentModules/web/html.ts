import { ternary, L, write } from "../../utils";
import { AugmentModule, Extension } from "../../common/augmentModule";
import { Prompt } from "../../common/prompt";

declare global {
    interface Config {
        html?: boolean;
        htmlTitle?: string;
        htmlFilename?: string;
        htmlTemplate?: string;
    }
}

export default class implements Extension {
    executeIf(resp: Config) {
        return resp.type === 'web';
    }

    prompts() {
        const prompts: Prompt<keyof Config>[] = [
            {when: (resp: Config) => {
                return resp.type === 'web';
            },
                type: 'confirm',
                name: 'html',
                default: true,
                message: 'Create html file? Scripts and style sheets will automatically be inserted into this file.'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                type: 'input',
                name: 'htmlTitle',
                default: 'Webpack App',
                message: '(html) Title'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                type: 'input',
                name: 'htmlFilename',
                default: 'index.html',
                message: '(html) Output file'
            },
            {
                when: (resp: Config) => {
                    return resp.html;
                },
                filter: (input: string) => {
                    return input.trim() || undefined;
                },
                type: 'input',
                name: 'htmlTemplate',
                message: '(html) Template file (will create a standard html file if not specified)'
            }
        ]
        return prompts;
    }
    AugmentModule = class extends AugmentModule {

    

    augment(): void {
        const { html,htmlTitle, htmlFilename, htmlTemplate } = this.config;

        if (!html)
        return;

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