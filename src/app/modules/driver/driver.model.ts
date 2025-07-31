import { model, Schema } from "mongoose";
import { IDriver } from "./driver.interface";


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
    isAvailable: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

export const Driver = model<IDriver>("Driver", driverSchema)