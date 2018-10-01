
import { AugmentModule } from "../../common/augmentModule";

export default class extends AugmentModule {

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
