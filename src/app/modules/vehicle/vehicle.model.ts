/* eslint-disable @typescript-eslint/no-explicit-any */
import { model, Schema } from "mongoose";
import { IVehicle, VehicleType } from "./vehicle.interface";
import { User } from "../user/user.model";
import AppError from "../../errorHelpers/AppError";
import { Role } from "../user/user.interface";


const vehicleSchema = new Schema<IVehicle>({
    driver: {
        type: Schema.Types.ObjectId,
        ref: "User",
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

vehicleSchema.pre("save", async function (next) {
    try {

        const missingFields = []

        const userId = this.driver.toString()

        const user = await User.findById(userId)

        if (!user) {
            throw new AppError(400, "User doesn't exists!!")
        }

        if (!user.address) missingFields.push("address")
        if (!user.image) missingFields.push("image")

        if (user.role === Role.SUPER_ADMIN) {
            throw new AppError(400, "Super admin can not register vehicle")
        }

        if (missingFields.length > 0) {
            throw new AppError(
                400,
                `Before registering vehicle, update your profile: ${missingFields.join(", ")}`
            )
        }

        user.role = Role.DRIVER
        await user.save()
        next()

    } catch (error: any) {
        next(error)
    }
})

export const Vehicle = model<IVehicle>("Vehicle", vehicleSchema)