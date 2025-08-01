import { Types } from "mongoose";

export enum AVAILABILITY_STATUS {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE"
}

export interface IDriver {
    user: Types.ObjectId;
    vehicle: Types.ObjectId;
    licenseNumber: string;
    experience: number;
    totalRides: number;
    totalEarnings: number;
    availabilityStatus: AVAILABILITY_STATUS;
    isApproved: boolean;
}