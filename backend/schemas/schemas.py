from schemas.businessprocess_schema import (
    CreateBusinessProcessSchema,
    CreateFlowChartSchema,
    UpdateBusinessProcessSchema,
)
from schemas.requirement_schema import (
    AddRequirementSchema,
    UpdateRequirementSchema,
)
from schemas.solution_schema import CreateSolutionSchema, SolutionIdSchema
from schemas.task_schema import (
    CreateTaskSchema,
    AddTaskSchema,
    UpdateTaskSchema
)
from schemas.userstories_schema import (
    CreateUserStorySchema,
    AddUserStorySchema,
    UpdateUserStorySchema
)

from schemas.chat_schema import GenericChatSchema, ImproveSuggestionSchema, ConverseRequirementSchema, ConverseUserStoryTaskSchema
from schemas.prd_schema import CreatePRDsSchema


create_solution_schema = CreateSolutionSchema()
solution_id_schema = SolutionIdSchema()
update_requirement_schema = UpdateRequirementSchema()
add_requirement_schema = AddRequirementSchema()
create_task_schema = CreateTaskSchema()
create_user_story_schema = CreateUserStorySchema()
create_process_flow_chart_schema = CreateFlowChartSchema()
create_business_process_schema = CreateBusinessProcessSchema()
update_business_process_schema = UpdateBusinessProcessSchema()
add_user_story_schema = AddUserStorySchema()
update_user_story_schema = UpdateUserStorySchema()
add_task_schema = AddTaskSchema()
update_task_schema = UpdateTaskSchema()
chat_generic_schema = GenericChatSchema()
chat_improve_suggestion_schema = ImproveSuggestionSchema()
chat_update_requirement_schema = ConverseRequirementSchema()
chat_update_user_story_schema = ConverseUserStoryTaskSchema()
create_prds_schema = CreatePRDsSchema()