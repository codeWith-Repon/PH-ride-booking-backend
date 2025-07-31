import { model, Schema } from "mongoose";
import { IVehicle, VehicleType } from "./vehicle.interface";


const vehicleSchema = new Schema<IVehicle>({
    driver: {
        type: Schema.Types.ObjectId,
        ref: "Driver",
        required: [true, "Driver ID is required"]
    },
    vehicleType: {
        type: String,
        enum: {
            values: Object.values(VehicleType),
            message: "{VALUE} is not a vehicle type"
        },

        default: VehicleType.CAR
    },
    brand: {
        type: String,
        required: [true, "Brand name is required"]
    },
    model: {
        type: String,
        required: [true, "Brand name is required"]
    },
    image: {
        type: [String],
        default: []
    },
    vehicleLicense: {
        type: String,
        required: [true, "Vehicle License is required"],
        unique: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

export const Vehicle = model<IVehicle>("Vehicle", vehicleSchema)