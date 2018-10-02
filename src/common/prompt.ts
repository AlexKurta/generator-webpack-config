import { Omit } from "type-zoo";

interface BasePrompt {
    when?(resp: Config): boolean | undefined;
    message: string;
}

interface InputPrompt<TKey extends keyof Config> extends BasePrompt {
    type: 'input';
    name: Config[TKey] extends string | undefined ? TKey : never;
    filter?(input: string): string | undefined;
    default?: string;
}

export function inputPrompt<TKey extends keyof Config>(opts: Omit<InputPrompt<TKey>, 'type'>): InputPrompt<TKey> {
    return {
        type: 'input',
        ...opts
    }
}

interface ListPrompt<TKey extends keyof Config> extends BasePrompt {
    type: 'list';
    name: Config[TKey] extends string ? TKey : never;
    choices: { name: string; value: Config[TKey]; }[];
    default?: Config[TKey];
}

export function listPrompt<TKey extends keyof Config>(opts: Omit<ListPrompt<TKey>, 'type'>): ListPrompt<TKey> {
    return {
        type: 'list',
        ...opts
    }
}

interface ConfirmPrompt<TKey extends keyof Config> extends BasePrompt {
    type: 'confirm';
    name: Config[TKey] extends boolean | undefined ? TKey : never;
    default?: boolean;
}

export function confirmPrompt<TKey extends keyof Config>(opts: Omit<ConfirmPrompt<TKey>, 'type'>): ConfirmPrompt<TKey> {
    return {
        type: 'confirm',
        ...opts
    }
}

export type Prompt<TKey extends keyof Config> =
    InputPrompt<TKey>
    | ListPrompt<TKey>
    | ConfirmPrompt<TKey>;