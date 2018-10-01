

import { ternary, L, write } from "../../utils";
import { AugmentModule } from "../../common/augmentModule";
import { Prompt } from "../../common/prompt";
import * as path from 'path';

declare global {
    interface Config {
        type: 'web' | 'node';
        entry: string;
        seperate_outdirs: boolean;
        outSingle?: string;
        outProd?: string;
        outDev?: string;
        outFileName: string;
    }
    interface Options {
        stats?: string
    }
}

export default class extends AugmentModule {

    private outDir = 'outDir';

    prompts() {// do not use subobject property notation (e.g. css.modules), because store:true does not work correctly with that
        const prompts: Prompt<keyof Config>[] = [
            {
                type: 'list',
                message: 'For what kind of project do you wish to create a webpack configuration?',
                name: 'type',
                choices: [
                    {
                        name: 'Web project',
                        value: 'web'
                    },
                    {
                        name: 'Node project',
                        value: 'node'
                    }
                ]
            },
            {
                type: 'input',
                name: 'entry',
                default: './src/index.js',
                message: 'Path to entry file'
            },
            {
                type: 'confirm',
                name: 'seperate_outdirs',
                default: true,
                message: 'Separate output directories for production and development mode?'
            },
            {
                when: (resp: Config) => {
                    return resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outProd',
                default: path.join('build', 'release'),
                message: '(output) Production directory'
            },
            {
                when: (resp: Config) => {
                    return resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outDev',
                default: path.join('build', 'debug'),
                message: '(output) Development directory'
            },
            {
                when: (resp: Config) => {
                    return !resp.seperate_outdirs;
                },
                type: 'input',
                name: 'outSingle',
                default: 'build',
                message: '(output) Directory'
            },
            {
                type: 'input',
                name: 'outFileName',
                default: '[chunkhash].bundle.js',
                message: '(output) File name'
            },
        ]
        return prompts;
    }

    augment(): void {
        this.addVariables();
        this.augmentConfigObject();
        this.addCleanWebpackPlugin();
    }

    private addVariables() {
        const { outSingle, outDev, outProd } = this.config;

        this.insertVariableStatement({
            declarations: [
                {
                    name: this.isDev,
                    initializer: "argv.mode === 'development'"
                },
                {
                    name: this.outDir,
                    initializer: outSingle ? `'${outSingle}'` : ternary(this.isDev, outDev, outProd).text
                }]
        })

    }

    private augmentConfigObject() {
        const { entry, outFileName } = this.config;
        const { stats } = this.options;

        this.addToConfigObject({
            entry,
            output: {
                path: L(`path.resolve(__dirname, ${this.outDir})`),
                filename: outFileName
            },
            ...(stats && { stats }),
            devtool: ternary(this.isDev, "eval-source-map", 'nosources-source-map')
        });
    }

    private addCleanWebpackPlugin() {

        this.addImportDeclaration({
            namespaceImport: 'CleanWebpackPlugin',
            moduleSpecifier: 'clean-webpack-plugin'
        })

        this.addPlugins(
            write(L(`new CleanWebpackPlugin(${this.outDir}, { verbose: false })`))
        )
    }
}
