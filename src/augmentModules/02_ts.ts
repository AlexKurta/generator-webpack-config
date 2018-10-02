import { AugmentModule, Extension } from "../common/augmentModule";
import { Prompt, confirmPrompt, inputPrompt } from "../common/prompt";

declare global {
    interface Config {
        ts: boolean;
        tsConfig?: string;
    }
}

export default class implements Extension {

    prompts() {
        const prompts: Prompt<keyof Config>[] = [
            confirmPrompt<'ts'>({
                name: 'ts',
                default: false,
                message: 'Enable typescript transpilation?'
            }),
            inputPrompt<'tsConfig'>({
                when: (resp) => {
                    return resp.ts;
                },
                filter: (input) => {
                    return input.trim() || undefined;
                },
                name: 'tsConfig',
                message: '(typescript) Location of tsconfig.json (leave empty for default)'
            }),
        ]

        return prompts;
    }

    AugmentModule = class extends AugmentModule {

        augment(): void {
            const { ts, tsConfig } = this.config;

            if (!ts) return;

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
}