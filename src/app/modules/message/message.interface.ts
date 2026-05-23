import { Types } from "mongoose";

export interface IMessage {
    _id?: Types.ObjectId;
    ride: Types.ObjectId;
    sender: Types.ObjectId;
    recipient: Types.ObjectId;
    text: string;
    readAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
