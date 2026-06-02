export interface IMatchQuery {
    lat: number;
    lng: number;
    /** Search radius in km. Default 8, max 50. */
    maxRadiusKm?: number;
    /** Max candidates to return. Default 5, max 20. */
    limit?: number;
    /** Drop drivers whose lastLocationAt is older than this. Default 120, max 3600. */
    maxStaleSeconds?: number;
}

export interface IMatchFactors {
    distance: number;
    rating: number;
    experience: number;
    recency: number;
}

export interface IMatchCandidate {
    driverId: string;
    userId: string;
    name?: string;
    image?: string;
    distanceKm: number;
    rating: number;
    experience: number;
    secondsSinceUpdate: number;
    score: number;            // 0..1
    factors: IMatchFactors;
}
