/* eslint-disable @typescript-eslint/no-explicit-any */

import { Model } from "mongoose";
import { NestedMapping } from "./QueryBuilder";
import { User } from "../modules/user/user.model";
import { Vehicle } from "../modules/vehicle/vehicle.model";

// Map string keys to actual Mongoose Models
const modelMap: Record<string, Model<any>> = {
    user: User,
    vehicle: Vehicle,
};

export const generateNestedMappings = (fields: string[] | Record<string, string>): NestedMapping[] => {
    const mappings: NestedMapping[] = [];

    // Handle both Array (SearchFields) and Object (FilterFields)
    const entries = Array.isArray(fields)
        ? fields.map(f => [f.split('.').pop(), f]) // For arrays: [brand, vehicle.brand]
        : Object.entries(fields);                  // For objects: [email, user.email]

    for (const [queryField, path] of entries) {
        if (path && path.includes('.')) {
            const [parent, child] = path.split('.');

            if (modelMap[parent]) {
                mappings.push({
                    model: modelMap[parent],
                    queryField: queryField as string,
                    pathInCurrentDoc: parent,
                    pathInTargetDoc: child,
                });
            }
        }
    }

    return mappings;
};