import { AugmentModule } from "../../common/augmentModule";
import { Prompt } from "../../common/prompt";

declare global {
    interface Config {
        ts: boolean;
        tsConfig?: string;
    }
}

export default class extends AugmentModule {

    prompts() {
        const prompts: Prompt<keyof Config>[] = [
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
        ]
        return prompts;
    }

    augment(): void {
        const { tsConfig } = this.config;

        this.addResolveExtensions(
            '.ts',
            '.tsx'
        )

        this.addRules(
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
}
