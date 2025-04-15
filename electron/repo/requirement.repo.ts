import { DatabaseClient } from "../db/client";
import { document } from "../db/solution.schema";
import { withTransaction } from "../utils/transaction.decorator";

export class RequirementRepository {
    private dbClient: DatabaseClient;

    constructor() {
        this.dbClient = DatabaseClient.getInstance();
    }

    @withTransaction()
    async saveRequirement(
        requirement: {
            title: string;
            requirement: string;
            documentTypeId: string;
        }, 
        tx?: any
    ) {
        return await tx.insert(document).values({
            name: requirement.title,
            description: requirement.requirement,
            documentTypeId: requirement.documentTypeId.toLowerCase(),
            count: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
}
