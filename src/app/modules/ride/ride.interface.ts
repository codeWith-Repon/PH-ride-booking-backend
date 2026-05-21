import { Types } from "mongoose";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../payment/payment.interface";


export enum RIDE_STATUS {
    REQUESTED = "REQUESTED",
    ACCEPTED = "ACCEPTED",
    PICKED_UP = "PICKED UP",
    IN_TRANSIT = "IN TRANSIT",
    COMPLETED = "COMPLETED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}


export interface IPickupCoordinates {
    lat: number;
    lng: number;
}

export interface IRide {
    _id?: Types.ObjectId;
    user: Types.ObjectId;
    driver?: Types.ObjectId;
    payment?: Types.ObjectId;
    pickupLocation: string;
    pickupCoordinates?: IPickupCoordinates;
    dropLocation: string;
    rideStatus: RIDE_STATUS;
    paymentStatus: PAYMENT_STATUS;
    paymentMethod: PAYMENT_METHOD;
    fare: number;
    distance: number;
    isOtpVerified: boolean;
    startedAt?: Date;
    completedAt?: Date;
}