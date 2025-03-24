import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";

export class SetLLMConfig {
    static readonly type = '[LLMConfig] Set';
    constructor(public payload: LLMConfigModel) { }
}

export class SwitchProvider {
    static readonly type = '[LLMConfig] Switch Provider';
    constructor(public provider: string) { }
}

export class VerifyLLMConfig {
    static readonly type = '[LLMConfig] Verify';
}

export class SyncLLMConfig {
    static readonly type = '[LLMConfig] Sync';
}
