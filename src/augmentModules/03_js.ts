
import { AugmentModule, Extension } from "../common/augmentModule";

export default class implements Extension {
    executeIf = (config: Config) => !config.ts;
    AugmentModule = class extends AugmentModule {

        augment(): void {

            this.addRules(
                {
                    test: /\.m?js$/i,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }
            )
        }
    }
}