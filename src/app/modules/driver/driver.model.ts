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
    }
}, {
    timestamps: true
})

export const Driver = model<IDriver>("Driver", driverSchema)