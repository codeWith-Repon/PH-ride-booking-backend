import { model, Schema } from "mongoose";
import { AVAILABILITY_STATUS, DRIVER_STATUS, IDriver } from "./driver.interface";


const driverSchema = new Schema<IDriver>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true,
        unique: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    experience: {
        type: Number,
        required: true
    },
    totalRides: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    availabilityStatus: {
        type: String,
        enum: Object.values(AVAILABILITY_STATUS),
        default: AVAILABILITY_STATUS.ONLINE
    },
    status: {
        type: String,
        enum: Object.values(DRIVER_STATUS),
        default: DRIVER_STATUS.PENDING
    },
    currentLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            validate: {
                validator: (v: number[]) =>
                    !v || (Array.isArray(v) &&
                        v.length === 2 &&
                        v[0] >= -180 && v[0] <= 180 &&
                        v[1] >= -90 && v[1] <= 90),
                message: "coordinates must be [lng, lat] within valid ranges"
            }
        }
    },
    lastLocationAt: { type: Date },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    ratingCount: { type: Number, default: 0 }
}, {
    timestamps: true
})

driverSchema.index({ currentLocation: "2dsphere" })

export const Driver = model<IDriver>("Driver", driverSchema)