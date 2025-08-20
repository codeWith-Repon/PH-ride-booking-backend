import { model, Schema } from "mongoose";
import { IRide, PAYMENT_STATUS, RIDE_STATUS } from "./ride.interface";


const rideSchema = new Schema<IRide>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Driver",
        required: true
    },
    payment: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        default: null
    },
    pickupLocation: {
        type: String,
        required: true
    },
    dropLocation: {
        type: String,
        required: true
    },
    rideStatus: {
        type: String,
        enum: Object.values(RIDE_STATUS),
        default: RIDE_STATUS.REQUESTED
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },
    fare: {
        type: Number,
        default: 0
    },
    distance: {
        type: Number,
        default: 0
    },
    rideOtp: {
        type: Number,
        default: null
    },
    isOtpVerified: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
})

export const Ride = model<IRide>("Ride", rideSchema)