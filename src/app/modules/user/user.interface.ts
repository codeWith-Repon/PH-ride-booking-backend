import { Types } from "mongoose";

export enum Role {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    RIDER = "RIDER",
    DRIVER = "DRIVER"
}

export enum IsActive {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    BLOCKED = "BLOCKED"
}

export interface IAuthProvider {
    provider: "google" | "credentials"; //"Google", "Credential"
    providerId: string
}

export interface IUser {
    _id?: Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    role: Role;
    phone?: string;
    address?: string;
    image?: string;
    isActive?: IsActive;
    isVerified?: boolean;
    isDeleted?: boolean;
    auths: IAuthProvider[];
    emergencyContactEmail: string[]
}