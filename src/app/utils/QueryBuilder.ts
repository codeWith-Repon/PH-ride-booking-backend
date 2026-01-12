/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { FilterQuery, Query } from "mongoose";
import { excludeFields } from "../constants";

export class QueryBuilder<T> {
    public modelQuery: Query<T[], T>;
    public readonly query: Record<string, any>
    private filterQuery: FilterQuery<T> = {}; // store filtered query

    constructor(modelQuery: Query<T[], T>, query: Record<string, string>) {
        this.modelQuery = modelQuery;
        this.query = query
    }

    // ---------------- FILTER ----------------
    filter(): this {
        const filter = { ...this.query }

        // remove non-filter fields (page, limit, sort, etc.)
        excludeFields.forEach((field) => delete filter[field]);

        // Convert numeric strings to numbers (experience=1)
        for (const key in filter) {
            const value = filter[key];

            if (value === "true") filter[key] = true;
            else if (value === "false") filter[key] = false;
            else if (!isNaN(Number(value))) filter[key] = Number(value);
        }

        this.filterQuery = filter as FilterQuery<T>; //  save for meta count
        this.modelQuery = this.modelQuery.find(this.filterQuery);

        return this
    }

    // ---------------- SEARCH ----------------
    search(searchableField: string[]): this {
        const searchTerm = this.query.searchTerm

        if (!searchTerm) return this;

        const searchQuery: FilterQuery<T> = {
            $or: searchableField.map((field) => (
                { [field]: { $regex: searchTerm, $options: "i" } }
            )) as any
        }

        this.modelQuery = this.modelQuery.find(searchQuery)

        // Merge filter + search safely
        if (Object.keys(this.filterQuery).length) {
            this.filterQuery = {
                $and: [this.filterQuery, searchQuery],
            } as FilterQuery<T>;
        } else {
            this.filterQuery = searchQuery;
        }

        return this
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
        const skip = (page - 1) * limit

        this.modelQuery = this.modelQuery.skip(skip).limit(limit)
        return this
    }

    // ---------------- POPULATE ----------------
    populate(path?: string, select?: string) {
        if (path) {
            this.modelQuery = this.modelQuery.populate(path, select);
        }
        return this;
    }


    // ---------------- BUILD ----------------
    build() {
        return this.modelQuery;
    }

    // ---------------- META ----------------
    async getMeta() {
        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;

        const totalDocument = await this.modelQuery.model.countDocuments(
            this.filterQuery
        );

        const totalPage = Math.ceil(totalDocument / limit)

        const meta = {
            page,
            limit,
            total: totalDocument,
            totalPage
        }
        return meta
    }
}
