import { model, Schema } from "mongoose";

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    ride: {
        type: Schema.Types.ObjectId,
        ref: "Ride",
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, {
    timestamps: true
});

export const Notification = model("Notification", notificationSchema);