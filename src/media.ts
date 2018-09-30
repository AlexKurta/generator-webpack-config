import { Context } from "./context";
import { ternary, insertToObject, L, getNestedPropertyValue, addToArray, write, insertToArray } from "./utils";
import { ArrayLiteralExpression } from "ts-simple-ast";

export interface MediaOptions {
    urlloaderbytes?: number;
}

export function addMedia({ isDev, config }: Context, { urlloaderbytes }: MediaOptions) {

    const urlLoaderWithSizeLimit = {
        loader: 'url-loader',
        options: {
            limit: typeof urlloaderbytes === 'number' ? urlloaderbytes : 8192, // will convert media < 8kb to base64 strings
            name: 'media/[name]-[hash].[ext]' // <- for file-loader
        }
    }

    addToArray(
        config.rules,
        {
            test: /\.(png|jpe?g|gif|svg)$/i,
            use: [
                urlLoaderWithSizeLimit,
                {
                    loader: 'image-webpack-loader',
                    options: {
                        disable: L(isDev)
                    }
                }
            ]
        },
        {
            test: /\.mp4$/i,
            ...urlLoaderWithSizeLimit
        }
    )
}