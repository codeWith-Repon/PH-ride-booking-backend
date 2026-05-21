import { Types } from "mongoose";

export interface IGeoPoint {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
}

export interface ILocationPing {
    _id?: Types.ObjectId;
    ride: Types.ObjectId;
    driver: Types.ObjectId;
    location: IGeoPoint;
    speed?: number;
    heading?: number;
    accuracy?: number;
    recordedAt: Date;
}
