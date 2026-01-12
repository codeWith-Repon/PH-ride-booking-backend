import { generateNestedMappings } from "../../utils/generateNestedMappings";

export const vehicleSearchableFields = [
    "brand",
    "model",
    "vehicleLicense",
    "vehicleType",
    "driver.licenseNumber" // Nested search field
];

export const vehicleFilterableFields: Record<string, string> = {
    vehicleType: "vehicleType",
    brand: "brand",
    isDeleted: "isDeleted",
    driverLicense: "driver.licenseNumber",
    email: "driver.email"
};

// Generate mappings for the Driver relation
export const vehicleNestedFilterMapping = generateNestedMappings(vehicleFilterableFields);
export const vehicleNestedSearchMapping = generateNestedMappings(vehicleSearchableFields);