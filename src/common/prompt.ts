interface BasePrompt<TKey extends keyof Config> {
    when?(resp: Config): boolean | undefined;

    message: string;
    name: TKey;
}

interface InputPrompt<TKey extends keyof Config> extends BasePrompt<TKey> {
    type: 'input';
    filter?(input: string): string | undefined;
    default?: string;
}

interface ListPrompt<TKey extends keyof Config> extends BasePrompt<TKey> {
    type: 'list';
    name: TKey;
    choices: { name: string; value: Config[TKey]; }[];
    default?: Config[TKey];
}

interface ConfirmPrompt<TKey extends keyof Config> extends BasePrompt<TKey> {
    type: 'confirm';
    default?: boolean;
}

export type Prompt<TKey extends keyof Config> =
    InputPrompt<TKey>
    | ListPrompt<TKey>
    | ConfirmPrompt<TKey>;