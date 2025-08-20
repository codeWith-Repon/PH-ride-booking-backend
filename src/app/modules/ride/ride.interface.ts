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

export enum PAYMENT_STATUS {
    PENDING = "PENDING",
    CANCEL = "CANCEL",
    COMPLETE = "COMPLETE",
    FAILED = "FAILED"
}

export interface IRide {
    user: Types.ObjectId;
    driver: Types.ObjectId;
    payment?: Types.ObjectId;
    pickupLocation: string;
    dropLocation: string;
    rideStatus: RIDE_STATUS;
    paymentStatus: PAYMENT_STATUS;
    fare: number;
    distance?: number;
    rideOtp: number;
    isOtpVerified: boolean;
    startedAt?: Date;
    completedAt?: Date;
}