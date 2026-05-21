import { Types } from "mongoose";

export interface IPickupPoint {
    lat: number;
    lng: number;
}

export interface IMatchOptions {
    /** Max search radius in km. Default 8. */
    maxRadiusKm?: number;
    /** Max number of candidates to return. Default 5. */
    limit?: number;
    /** Drop drivers whose lastLocationAt is older than this (seconds). Default 120. */
    maxStaleSeconds?: number;
}

export interface IMatchCandidate {
    driverId: Types.ObjectId;
    userId: Types.ObjectId;
    name?: string;
    distanceKm: number;
    rating: number;
    experience: number;
    secondsSinceUpdate: number;
    score: number;
    /** Per-factor breakdown for debugging / UI explanations. */
    factors: {
        distance: number;
        rating: number;
        experience: number;
        recency: number;
    };
}

export const DEFAULT_WEIGHTS = {
    distance: 0.55,
    rating: 0.20,
    experience: 0.10,
    recency: 0.15
} as const;
