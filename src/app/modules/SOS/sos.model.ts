import { model, Schema } from "mongoose";
import { ISos, SOS_STATUS } from "./sos.interface";

const SOSSchema = new Schema<ISos>({
    ride: {
        type: Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
    },
    location: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    contactEmails: {
        type: [String],
        required: true
    },
    status: {
        type: String,
        enum: Object.values(SOS_STATUS),
        default: SOS_STATUS.PENDING
    }
}, {
    timestamps: true
})

export const SOS = model<ISos>("SOS", SOSSchema)