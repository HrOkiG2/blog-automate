export interface ModelfileConfig {
    baseModel: string;
    temperature?: number;
    numCtx?: number;
    topP?: number;
    systemPrompt: string;
}

export interface CreateModelOptions {
    modelName: string;
    modelfileType: 'content' | 'seo';
    force?: boolean;
}

export interface ModelInfo {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

export interface CreateModelResponse {
    status: string;
}
