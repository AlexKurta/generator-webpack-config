export interface Config {
    type: 'web' | 'node';
    entry: string;
    seperate_outdirs: boolean;
    outSingle?: string;
    outProd?: string;
    outDev?: string;
    outFileName: string;
    ts: boolean;
    tsConfig?: string;
    cssModules?: boolean;
    tsdecl?: boolean;
    html?: boolean;
    htmlTitle?: string;
    htmlFilename?: string;
    htmlTemplate?: string;
}