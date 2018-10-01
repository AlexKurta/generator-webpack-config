

import { L } from "../../utils";
import { AugmentModule, Extension } from "../../common/augmentModule";

export default class implements Extension {
    executeIf = (config: Config) => config.type === 'node';
    AugmentModule = class extends AugmentModule {

        augment(): void {

            this.addToConfigObject({
                target: 'node',
                node: {
                    __dirname: false
                },
                externals: [
                    L(`// instead of search for node_modules folders and excluding every found module individually, just do this:
                    function (context, request: string, callback: Function) {
    if (/^\\w/.test(request)) {
    return callback(null, 'commonjs ' + request);
    }
    callback();
    }`)
                ]
            });
        }
    }
}