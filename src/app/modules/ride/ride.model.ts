import { HydratedDocument, model, Schema } from "mongoose";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../payment/payment.interface";


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
        default: PAYMENT_STATUS.UNPAID
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
        default: PAYMENT_METHOD.CASH
    },
    fare: {
        type: Number,
        default: 0
    },
    distance: {
        type: Number,
        default: 0
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
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    ratingComment: {
        type: String,
        maxlength: 500
    },
    ratedAt: {
        type: Date
    },
    riderCurrentLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: undefined
        },
        coordinates: {
            type: [Number],   // [lng, lat]
            default: undefined
        }
    },
    riderLastLocationAt: {
        type: Date
    }
}, {
    timestamps: true
})

export const Ride = model<IRide>("Ride", rideSchema)

export type RideDocument = HydratedDocument<IRide>;