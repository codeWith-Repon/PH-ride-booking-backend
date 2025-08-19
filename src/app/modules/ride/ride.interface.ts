import { Types } from "mongoose";


export enum RIDE_STATUS {
    REQUESTED = "REQUESTED",
    ACCEPTED = "ACCEPTED",
    PICKED_UP = "PICKED UP",
    IN_TRANSIT = "IN TRANSIT",
    COMPLETED = "COMPLETED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}

export interface IRide {
    user: Types.ObjectId;
    driver: Types.ObjectId;
    payment?: Types.ObjectId;
    pickupLocation: string;
    dropLocation: string;
    status: RIDE_STATUS;
    fare: number;
    distance?: number;
    rideOtp: number;
    isOtpVerified: boolean;
    startedAt?: Date;
    completedAt?: Date;
}