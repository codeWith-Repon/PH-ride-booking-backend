import { model, Schema } from "mongoose";
import { ILocationPing } from "./tracking.interface";

const locationPingSchema = new Schema<ILocationPing>({
    ride: {
        type: Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
        index: true
    },
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Driver",
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
            required: true
        },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (v: number[]) =>
                    Array.isArray(v) &&
                    v.length === 2 &&
                    v[0] >= -180 && v[0] <= 180 &&
                    v[1] >= -90 && v[1] <= 90,
                message: "coordinates must be [lng, lat] within valid ranges"
            }
        }
    },
    speed: { type: Number },
    heading: { type: Number },
    accuracy: { type: Number },
    recordedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { timestamps: true });

locationPingSchema.index({ ride: 1, recordedAt: -1 });
locationPingSchema.index({ location: "2dsphere" });

export const LocationPing = model<ILocationPing>("LocationPing", locationPingSchema);
