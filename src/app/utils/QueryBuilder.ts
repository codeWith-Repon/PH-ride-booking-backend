/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { FilterQuery, Model, Query } from "mongoose";
import { excludeFields } from "../constants";

export interface NestedMapping {
    model: Model<any>;
    queryField: string;      // The field in req.query (e.g., 'brand')
    pathInCurrentDoc: string; // The reference field in current model (e.g., 'vehicle')
    pathInTargetDoc: string;  // The field in the nested model (e.g., 'brand')
}

export class QueryBuilder<T> {
    public modelQuery: Query<T[], T>;
    public readonly query: Record<string, any>
    private filterQuery: FilterQuery<T> = {}; // store filtered query

    constructor(modelQuery: Query<T[], T>, query: Record<string, string>) {
        this.modelQuery = modelQuery;
        this.query = query
    }

    // ---------------- FILTER (With Nested Support) ----------------
    async filter(nestedConfigs?: NestedMapping[]): Promise<this> {
        const filter = { ...this.query };

        // 1. Remove non-filter fields
        excludeFields.forEach((field) => delete filter[field]);

        // 2. Resolve Nested Filters (if configs are provided)
        if (nestedConfigs) {
            for (const config of nestedConfigs) {
                if (filter[config.queryField]) {
                    const value = filter[config.queryField];

                    // Find matching IDs in the related collection
                    const docs = await config.model.find({
                        [config.pathInTargetDoc]: { $regex: value, $options: "i" }
                    }).select("_id");

                    const ids = docs.map((d) => d._id);

                    // Replace flat query with ID-in filter
                    filter[config.pathInCurrentDoc] = { $in: ids };
                    delete filter[config.queryField];
                }
            }
        }

        // 3. Clean and convert types (Booleans/Numbers)
        for (const key in filter) {
            const value = filter[key];
            if (value === "true") filter[key] = true;
            else if (value === "false") filter[key] = false;
            else if (typeof value === 'string' && !isNaN(Number(value)) && !key.toLowerCase().includes('id')) {
                filter[key] = Number(value);
            }
        }

        this.filterQuery = filter as FilterQuery<T>;
        this.modelQuery = this.modelQuery.find(this.filterQuery);

        return this;
    }

    // ---------------- SEARCH (Handles local fields) ----------------
    async search(searchableField: string[], nestedConfigs?: NestedMapping[]): Promise<this> {
        const searchTerm = this.query.searchTerm;

        if (!searchTerm) return this;

        const orConditions: any[] = [];

        // 1. Handle Local Fields
        const localFields = searchableField.filter(field => !field.includes('.'));
        localFields.forEach(field => {
            orConditions.push({ [field]: { $regex: searchTerm, $options: "i" } });
        });

        // 2. Handle Nested Search Fields (if configs are provided)
        if (nestedConfigs) {
            for (const config of nestedConfigs) {
                // Check if this config's field is part of the searchableField array
                // e.g., if searchableField has 'user.name', we look for 'user.name' in the target model
                const isSearchable = searchableField.some(sf => sf === `${config.pathInCurrentDoc}.${config.pathInTargetDoc}`);

                if (isSearchable) {
                    const docs = await config.model.find({
                        [config.pathInTargetDoc]: { $regex: searchTerm, $options: "i" }
                    }).select("_id");

                    if (docs.length > 0) {
                        const ids = docs.map(d => d._id);
                        orConditions.push({ [config.pathInCurrentDoc]: { $in: ids } });
                    }
                }
            }
        }

        if (orConditions.length > 0) {
            const searchQuery = { $or: orConditions } as FilterQuery<T>;
            this.modelQuery = this.modelQuery.find(searchQuery);

            // Merge for getMeta count
            if (Object.keys(this.filterQuery).length) {
                this.filterQuery = { $and: [this.filterQuery, searchQuery] } as FilterQuery<T>;
            } else {
                this.filterQuery = searchQuery;
            }
        }

        return this;
    }

    // ---------------- SORT ----------------
    sort(): this {
        const sort = this.query.sort || "-createdAt";
        this.modelQuery = this.modelQuery.sort(sort)
        return this
    }

    // ---------------- FIELDS ----------------
    fields(): this {
        const fields = this.query.fields?.split(",").join(" ")

        // Avoid empty select string
        if (fields) {
            this.modelQuery = this.modelQuery.select(fields);
        }

        return this
    }

    // ---------------- PAGINATION ----------------
    paginate(): this {
        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;
        const skip = (page - 1) * limit;

        this.modelQuery = this.modelQuery.skip(skip).limit(limit);
        return this;
    }

    // ---------------- POPULATE ----------------
    populate(path?: string, select?: string): this {
        if (path) {
            this.modelQuery = this.modelQuery.populate(path, select);
        }
        return this;
    }

    // ---------------- FINAL EXECUTION ----------------
    build() {
        return this.modelQuery;
    }

    async getMeta() {
        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;

        const totalDocument = await this.modelQuery.model.countDocuments(this.filterQuery);
        const totalPage = Math.ceil(totalDocument / limit);

        return { page, limit, total: totalDocument, totalPage };
    }
}