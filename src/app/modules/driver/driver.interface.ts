import { Types } from "mongoose";

export enum AVAILABILITY_STATUS {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE"
}

export enum DRIVER_STATUS {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    SUSPENDED = "SUSPENDED"
}

export interface IGeoPoint {
    type: "Point";
    /** [longitude, latitude] — GeoJSON order */
    coordinates: [number, number];
}

export interface IDriver {
    user: Types.ObjectId;
    vehicle: Types.ObjectId;
    licenseNumber: string;
    experience: number;
    totalRides: number;
    totalEarnings: number;
    availabilityStatus: AVAILABILITY_STATUS;
    status: DRIVER_STATUS;
    currentLocation?: IGeoPoint;
    lastLocationAt?: Date;
    rating?: number;       // 0..5
    ratingCount?: number;
}
