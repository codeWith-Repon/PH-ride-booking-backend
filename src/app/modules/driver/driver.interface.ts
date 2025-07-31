import { Types } from "mongoose";


export interface IDriver {
    driver: Types.ObjectId;
    vehicle: Types.ObjectId;
    licenseNumber: string;
    experience: number;
    totalRides: number;
    totalEarnings: number;
    isAvailable: boolean;
    isApproved: boolean;
}