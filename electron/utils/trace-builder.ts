import { OPERATIONS } from '../helper/constants';

export function traceBuilder(type: string, operation: OPERATIONS) {
    return `${type}:${operation}`.toLowerCase();
}
