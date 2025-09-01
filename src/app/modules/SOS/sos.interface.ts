import { Types } from "mongoose";
import { IRide } from "../ride/ride.interface";

export enum SOS_STATUS {
    PENDING = "PENDING",
    RESOLVED = "RESOLVED",
    IGNORED = "IGNORED"
}


export interface ISos {
    ride: IRide,
    location: string,
    message?: string,
    sender: Types.ObjectId,
    contactEmails: string[],
    status: SOS_STATUS
}