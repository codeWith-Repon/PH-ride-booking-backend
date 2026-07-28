import { Types } from "mongoose";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../payment/payment.interface";
import { IGeoPoint } from "../driver/driver.interface";


export enum RIDE_STATUS {
    REQUESTED = "REQUESTED",
    ACCEPTED = "ACCEPTED",
    PICKED_UP = "PICKED UP",
    IN_TRANSIT = "IN TRANSIT",
    COMPLETED = "COMPLETED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}

/** Ride statuses during which the rider hasn't been picked up yet — the window rider-location tracking is active for. */
export const RIDER_TRACKABLE_STATUSES: RIDE_STATUS[] = [RIDE_STATUS.REQUESTED, RIDE_STATUS.ACCEPTED];


export interface IRide {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    driver: Types.ObjectId;
    payment?: Types.ObjectId;
    pickupLocation: string;
    dropLocation: string;
    rideStatus: RIDE_STATUS;
    paymentStatus: PAYMENT_STATUS;
    paymentMethod: PAYMENT_METHOD;
    fare: number;
    distance: number;
    isOtpVerified: boolean;
    startedAt?: Date;
    completedAt?: Date;
    rating?: number;
    ratingComment?: string;
    ratedAt?: Date;
    /** Rider's live position — tracked only up to pickup (see RIDER_TRACKABLE_STATUSES). */
    riderCurrentLocation?: IGeoPoint;
    riderLastLocationAt?: Date;
}