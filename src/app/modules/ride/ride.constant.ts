import { generateNestedMappings } from "../../utils/generateNestedMappings";

// 1. Define the string-based searchable paths
export const rideSearchableFields: string[] = [
    "pickupLocation",
    "dropLocation",
    "user.name",
    "user.email",
    "payment.transactionId"
];

// 2. Define the filterable fields mapping
export const rideFilterableFields: Record<string, string> = {
    rideStatus: "rideStatus", 
    paymentStatus: "payment.status", 
    userEmail: "user.email", 
};

export const rideNestedFilterMapping = generateNestedMappings(rideFilterableFields);
export const rideNestedSearchMapping = generateNestedMappings(rideSearchableFields);