import { generateNestedMappings } from "../../utils/generateNestedMappings";

export const driverFilterableFields: Record<string, string> = {
    email: "user.email",
    vehicleType: "vehicle.vehicleType",
    model: "vehicle.model",
    brand: "vehicle.brand",
    licenseNumber: "licenseNumber",
    status: "status",
    vehicleLicense: "vehicleLicense"
};

export const driverSearchableFields: string[] = [
    "licenseNumber",
    "user.name",
    "user.email",
    "vehicle.brand",
    "vehicle.model",
    "vehicle.vehicleLicense",
];


// export const nestedFilterMapping: NestedMapping[] = [
//     { model: Vehicle, queryField: 'brand', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'brand' },
//     { model: Vehicle, queryField: 'model', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'model' },
//     { model: Vehicle, queryField: 'vehicleType', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'vehicleType' },
//     { model: Vehicle, queryField: 'vehicleLicense', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'vehicleLicense' },
//     { model: User, queryField: 'email', pathInCurrentDoc: 'user', pathInTargetDoc: 'email' },
// ];

// export const nestedSearchMapping: NestedMapping[] = [
//     { model: User, queryField: 'name', pathInCurrentDoc: 'user', pathInTargetDoc: 'name' },
//     { model: User, queryField: 'email', pathInCurrentDoc: 'user', pathInTargetDoc: 'email' },
//     { model: Vehicle, queryField: 'brand', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'brand' },
//     { model: Vehicle, queryField: 'model', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'model' },
//     { model: Vehicle, queryField: 'vehicleLicense', pathInCurrentDoc: 'vehicle', pathInTargetDoc: 'vehicleLicense' },
// ]

export const nestedFilterMapping = generateNestedMappings(driverFilterableFields);
export const nestedSearchMapping = generateNestedMappings(driverSearchableFields);
