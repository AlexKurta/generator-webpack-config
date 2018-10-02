
import { AugmentModule, Extension } from "../common/augmentModule";

export default class implements Extension {
    AugmentModule = class extends AugmentModule {

        augment(): void {

            const { ts } = this.config;

            if (ts) return;

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