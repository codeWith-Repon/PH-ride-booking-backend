/* eslint-disable @typescript-eslint/no-explicit-any */
import { Driver } from "../driver/driver.model";
import { AVAILABILITY_STATUS, DRIVER_STATUS } from "../driver/driver.interface";
import { RIDE_STATUS } from "../ride/ride.interface";
import AppError from "../../errorHelpers/AppError";
import {
    DEFAULT_WEIGHTS,
    IMatchCandidate,
    IMatchOptions,
    IPickupPoint
} from "./matching.interface";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const scoreCandidate = (
    distanceKm: number,
    maxRadiusKm: number,
    rating: number,
    experience: number,
    secondsSinceUpdate: number,
    maxStaleSeconds: number
) => {
    const distance = clamp01(1 - distanceKm / maxRadiusKm);
    const ratingNorm = clamp01((rating - 1) / 4);            // 1..5 → 0..1
    const experienceNorm = clamp01(experience / 10);          // 10y+ saturates
    const recency = clamp01(1 - secondsSinceUpdate / maxStaleSeconds);

    const score =
        distance * DEFAULT_WEIGHTS.distance +
        ratingNorm * DEFAULT_WEIGHTS.rating +
        experienceNorm * DEFAULT_WEIGHTS.experience +
        recency * DEFAULT_WEIGHTS.recency;

    return {
        score,
        factors: { distance, rating: ratingNorm, experience: experienceNorm, recency }
    };
};

const findNearbyCandidates = async (
    pickup: IPickupPoint,
    options: IMatchOptions = {}
): Promise<IMatchCandidate[]> => {
    const maxRadiusKm = options.maxRadiusKm ?? 8;
    const limit = options.limit ?? 5;
    const maxStaleSeconds = options.maxStaleSeconds ?? 120;

    const now = Date.now();
    const staleCutoff = new Date(now - maxStaleSeconds * 1000);

    // $geoNear MUST be the first stage. distanceField gives meters.
    const raw = await Driver.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
                distanceField: "distanceMeters",
                maxDistance: maxRadiusKm * 1000,
                spherical: true,
                query: {
                    availabilityStatus: AVAILABILITY_STATUS.ONLINE,
                    status: DRIVER_STATUS.APPROVED,
                    lastLocationAt: { $gte: staleCutoff }
                }
            }
        },
        // Exclude drivers currently on a live ride
        {
            $lookup: {
                from: "rides",
                let: { driverId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$driver", "$$driverId"] },
                            rideStatus: {
                                $in: [
                                    RIDE_STATUS.ACCEPTED,
                                    RIDE_STATUS.PICKED_UP,
                                    RIDE_STATUS.IN_TRANSIT
                                ]
                            }
                        }
                    },
                    { $limit: 1 }
                ],
                as: "activeRides"
            }
        },
        { $match: { activeRides: { $size: 0 } } },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userDoc"
            }
        },
        { $unwind: "$userDoc" },
        {
            $project: {
                _id: 1,
                user: 1,
                experience: 1,
                rating: { $ifNull: ["$rating", 5] },
                lastLocationAt: 1,
                distanceMeters: 1,
                "userDoc.name": 1
            }
        },
        { $limit: 50 } // hard cap before scoring in app
    ]);

    const scored: IMatchCandidate[] = raw.map((d: any) => {
        const distanceKm = (d.distanceMeters ?? 0) / 1000;
        const secondsSinceUpdate = d.lastLocationAt
            ? (now - new Date(d.lastLocationAt).getTime()) / 1000
            : maxStaleSeconds;

        const { score, factors } = scoreCandidate(
            distanceKm,
            maxRadiusKm,
            d.rating ?? 5,
            d.experience ?? 0,
            secondsSinceUpdate,
            maxStaleSeconds
        );

        return {
            driverId: d._id,
            userId: d.user,
            name: d.userDoc?.name,
            distanceKm,
            rating: d.rating ?? 5,
            experience: d.experience ?? 0,
            secondsSinceUpdate,
            score,
            factors
        };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
};

const findBestDriver = async (
    pickup: IPickupPoint,
    options: IMatchOptions = {}
): Promise<IMatchCandidate> => {
    const candidates = await findNearbyCandidates(pickup, { ...options, limit: 1 });
    if (candidates.length === 0) {
        throw new AppError(404, "No available drivers found near pickup location");
    }
    return candidates[0];
};

export const MatchingServices = {
    findNearbyCandidates,
    findBestDriver
};
