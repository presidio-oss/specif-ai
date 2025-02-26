# Standard library imports
import os

# Third-party imports
from typing import Optional, TypeVar
from git import Repo
from jinja2 import BaseLoader, Environment, FileSystemLoader
from pydantic import ValidationError

# Local application imports
from config.logging_config import logger

# Generic type
T = TypeVar('T')


def render_template(prompt_src: str) -> str:
    env = Environment(loader=BaseLoader(), autoescape=True)
    template = env.from_string(prompt_src)
    return template


def get_template_env() -> Environment:
    env = Environment(loader=FileSystemLoader([
        'llm/prompts', 'llm/prompts/solution', 'llm/prompts/context', 'llm/prompts/chat'
    ]), autoescape=True)
    return env


def create_git_project(path):
    repo = Repo.init(path)
    return repo


def commit_all_changes(repo, commit_message):
    # Add all changes to the staging area
    repo.git.add(A=True)
    # Commit the changes
    repo.git.commit(m=commit_message)


def push_changes(repo, remote_name='origin', branch='master'):
    # Push the changes to the remote repository
    repo.git.push(remote_name, branch)


def get_project_info(repo):
    latest_commit_message = repo.head.commit.message
    latest_commit_author = repo.head.commit.author
    latest_commit_date = repo.head.commit.committed_date
    return latest_commit_message, latest_commit_author, latest_commit_date


def check_file_exists(file_path):
    return os.path.isfile(file_path)


def update_llm_response_with_user_input(data, value, key_name=None):
    for item in data:
        for key in item:
            if key != 'id':
                if key_name:
                    item[key_name] = (item[key] + ' ' + value).strip()
                else:
                    item[key] += value
    return data


def override_llm_response_with_user_input(data, existing_value, value, key_name=None):
    for item in data:
        for key in item:
            if key != 'id':
                if key_name:
                    item[key_name] = value
                else:
                    item[key] = (existing_value + ' ' + value).strip()
    return data


def safe_parse_pydantic_model(model: T, data: dict) -> (Optional[T], Optional[Exception]):
    output = (None, Exception('Cannot able to parse the data'))

    try:
        output = (model(**data), None)
    except Exception as e:
        logger.error(f'Error occurred while parsing pydantic model: {e}')
        output = (None, e)

        if isinstance(e, ValidationError) and len(e.errors()) > 0:
            output = (None, e.errors()[0].get('msg'))

    return output
