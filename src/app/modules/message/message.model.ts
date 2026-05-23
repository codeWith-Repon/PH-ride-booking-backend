import { model, Schema } from "mongoose";
import { IMessage } from "./message.interface";

const messageSchema = new Schema<IMessage>(
    {
        ride: {
            type: Schema.Types.ObjectId,
            ref: "Ride",
            required: true,
            index: true
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        readAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

messageSchema.index({ ride: 1, createdAt: 1 });

export const Message = model<IMessage>("Message", messageSchema);
