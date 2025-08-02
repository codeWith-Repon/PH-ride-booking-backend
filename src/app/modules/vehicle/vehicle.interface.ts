import { Types } from "mongoose";

export enum VehicleType {
    CAR = "CAR",
    BIKE = "BIKE",
    CNG = "CNG",
    MINIVAN = "MINIVAN",
    PREMIUM = "PREMIUM",
    EV = "EV"
}


export interface IVehicle {
    driver: Types.ObjectId,
    vehicleType: VehicleType,
    brand: string,
    model: string,
    image?: string[],
    vehicleLicense: string,
    isDeleted: boolean
}