# Standard library imports
import math

# Third-party imports
from typing import List


class ValidatorsUtil:

    @staticmethod
    def empty_string(value: str | List[str]):
        if isinstance(value, str):
            value = value.strip()
            if not bool(value):
                raise Exception('Value cannot be empty string')
        elif isinstance(value, list):
            for idx in range(len(value)):
                value[idx] = ValidatorsUtil.empty_string(value[idx])
        else:
            raise Exception('Invalid type, Value can only be str | List[str]')

        return value

    @staticmethod
    def to_uppercase(value: str | List[str]):
        if isinstance(value, str):
            value = value.upper()
        elif isinstance(value, list):
            for idx in range(len(value)):
                value[idx] = ValidatorsUtil.to_uppercase(value[idx])
        else:
            raise Exception('Invalid type, Value can only be str | List[str]')

        return value

    @staticmethod
    def to_lowercase(value: str | List[str]):
        if isinstance(value, str):
            value = value.lower()
        elif isinstance(value, list):
            for idx in range(len(value)):
                value[idx] = ValidatorsUtil.to_lowercase(value[idx])
        else:
            raise Exception('Invalid type, Value can only be str | List[str]')

        return value

    @staticmethod
    def min_max(min_value=0, max_value=math.inf):
        def validator(value: str):
            if isinstance(value, str):
                value = ValidatorsUtil.empty_string(value)

                if min_value is not None:
                    if not (len(value) >= min_value):
                        raise Exception(f'Value should have a minimum of {min_value} character')

                if max_value is not None:
                    if not (len(value) <= max_value):
                        raise Exception(f'Value should not exceed maximum of {max_value} character')
            else:
                raise Exception('Invalid type, Value can only be str')
            return value

        return validator

    @staticmethod
    def string_equal(compare_str: str | List[str], case_sensitive=True):
        def validator(value: str):
            if isinstance(value, str):
                value = ValidatorsUtil.empty_string(value)

                if isinstance(compare_str, str):
                    parsed_compare_str = compare_str if case_sensitive else compare_str.lower()
                    value = value if case_sensitive else value.lower()

                    if not (parsed_compare_str == value):
                        raise Exception(f'{value} is not equal to {parsed_compare_str}')
                elif isinstance(compare_str, list):
                    parsed_compare_str = compare_str if case_sensitive else [str(item).lower() for item in compare_str]
                    value = value if case_sensitive else value.lower()

                    if not (value in parsed_compare_str):
                        raise Exception(f'{value} is not present in {parsed_compare_str}')
            else:
                raise Exception('Invalid type, Value can only be str')
            return value

        return validator
