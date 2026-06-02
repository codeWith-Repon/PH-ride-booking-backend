import { Driver } from "../driver/driver.model";
import { AVAILABILITY_STATUS, DRIVER_STATUS } from "../driver/driver.interface";
import { IMatchCandidate, IMatchQuery } from "./matching.interface";

const DEFAULTS = {
    maxRadiusKm: 8,
    limit: 5,
    maxStaleSeconds: 120,
};

const WEIGHTS = {
    distance: 0.55,
    rating: 0.2,
    recency: 0.15,
    experience: 0.1,
};

// Haversine distance in km between two lat/lng pairs
const haversineKm = (
    aLat: number,
    aLng: number,
    bLat: number,
    bLng: number
): number => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const getCandidates = async (
    query: IMatchQuery
): Promise<IMatchCandidate[]> => {
    const maxRadiusKm = query.maxRadiusKm ?? DEFAULTS.maxRadiusKm;
    const limit = query.limit ?? DEFAULTS.limit;
    const maxStaleSeconds = query.maxStaleSeconds ?? DEFAULTS.maxStaleSeconds;

    const freshAfter = new Date(Date.now() - maxStaleSeconds * 1000);

    // Geo query — $near already returns by proximity. We still rescore.
    const drivers = await Driver.find({
        status: DRIVER_STATUS.APPROVED,
        availabilityStatus: AVAILABILITY_STATUS.ONLINE,
        lastLocationAt: { $gte: freshAfter },
        currentLocation: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [query.lng, query.lat],
                },
                $maxDistance: maxRadiusKm * 1000, // meters
            },
        },
    })
        .limit(Math.max(limit * 3, 15))   // pull a few extra so the rescore has room
        .populate({ path: "user", select: "name image" })
        .lean();

    const now = Date.now();

    const scored: IMatchCandidate[] = drivers
        .filter((d) => d.currentLocation?.coordinates && d.lastLocationAt)
        .map((d) => {
            const [lng, lat] = d.currentLocation!.coordinates;
            const distanceKm = haversineKm(query.lat, query.lng, lat, lng);
            const secondsSinceUpdate = Math.floor(
                (now - new Date(d.lastLocationAt!).getTime()) / 1000
            );

            const distanceFactor = clamp01(1 - distanceKm / maxRadiusKm);
            const ratingFactor = clamp01((d.rating ?? 0) / 5);
            const recencyFactor = clamp01(
                1 - secondsSinceUpdate / maxStaleSeconds
            );
            const experienceFactor = clamp01((d.experience ?? 0) / 10);

            const score =
                WEIGHTS.distance * distanceFactor +
                WEIGHTS.rating * ratingFactor +
                WEIGHTS.recency * recencyFactor +
                WEIGHTS.experience * experienceFactor;

            const user = d.user as unknown as {
                _id: { toString(): string };
                name?: string;
                image?: string;
            };

            return {
                driverId: (d._id as { toString(): string }).toString(),
                userId: user?._id?.toString?.() ?? "",
                name: user?.name,
                image: user?.image,
                distanceKm: Number(distanceKm.toFixed(3)),
                rating: d.rating ?? 0,
                experience: d.experience ?? 0,
                secondsSinceUpdate,
                score: Number(score.toFixed(4)),
                factors: {
                    distance: Number(distanceFactor.toFixed(4)),
                    rating: Number(ratingFactor.toFixed(4)),
                    recency: Number(recencyFactor.toFixed(4)),
                    experience: Number(experienceFactor.toFixed(4)),
                },
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return scored;
};

const getBest = async (query: IMatchQuery): Promise<IMatchCandidate | null> => {
    const candidates = await getCandidates({ ...query, limit: 1 });
    return candidates[0] ?? null;
};

export const matchingService = {
    getCandidates,
    getBest,
};
