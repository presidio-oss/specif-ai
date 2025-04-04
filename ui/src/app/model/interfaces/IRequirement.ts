type Requirement = {
    title: string;
    requirement: string;
};

export interface IUpdateRequirementRequest {
    updatedReqt: string;
    fileContent: string;
    contentType: string;
    id: string;
    reqId: string;
    reqDesc: string;
    addReqtType: string;
    name: string;
    description: string;
    useGenAI: boolean;
    brds?: Array<Requirement>;
}

export interface IAddRequirementRequest {
    reqt?: string;
    fileContent?: string;
    contentType: string;
    id: string;
    title: string;
    addReqtType: string;
    name: string;
    description: string;
    useGenAI: boolean;
    brds?: Array<Requirement>;
}
