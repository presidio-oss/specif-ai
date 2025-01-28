import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";

export class SetLLMConfig {
    static readonly type = '[LLMConfig] Set';
    constructor(public payload: LLMConfigModel) { }
}

export class FetchDefaultLLMConfig {
    static readonly type = '[LLMConfig] Fetch Default';
}

export class VerifyLLMConfig {
    static readonly type = '[LLMConfig] Verify';
}

export class SyncLLMConfig {
    static readonly type = '[LLMConfig] Sync';
}
