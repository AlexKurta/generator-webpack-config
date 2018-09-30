import { Config } from "./common/config";
import * as path from 'path';

export interface GetQuestionsOptions {
    cssModuleTypingFileName: string;
}

export async function getQuestions({ cssModuleTypingFileName }: GetQuestionsOptions) {
    // do not use subobject property notation (e.g. css.modules), because store:true does not work correctly with that
    return [
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
        // ask input and output stuff:
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
        // ask typescript stuff:
        {
            type: 'confirm',
            name: 'ts',
            default: false,
            message: 'Enable typescript transpilation?'
        },
        {
            when: (resp: Config) => {
                return resp.ts;
            },
            filter: (input: string) => {
                return input.trim() || undefined;
            },
            type: 'input',
            name: 'tsConfig',
            message: '(typescript) Location of tsconfig.json (leave empty for default)'
        },
        // ask css stuff
        {
            when: (resp: Config) => {
                return resp.type === 'web';
            },
            type: 'confirm',
            name: 'cssModules',
            default: true,
            message: 'Use CSS modules?'
        },
        {
            when: (resp: Config) => {
                return resp.ts && resp.cssModules;
            },
            type: 'confirm',
            name: 'tsdecl',
            default: true,
            message: `Create TypeScript declaration file for *.css, *.scss and *.sass imports? This is required for working css modules. You will have to make sure your tsconfig.json includes this file in its configuration. It will be named \'${cssModuleTypingFileName}\'.`
        },
        // ask index.html stuff for web projects:
        {
            when: (resp: Config) => {
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
    ];
}