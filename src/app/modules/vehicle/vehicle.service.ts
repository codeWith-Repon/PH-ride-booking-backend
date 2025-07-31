import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { IVehicle } from "./vehicle.interface";
import { Vehicle } from "./vehicle.model";
import { Role } from "../user/user.interface";


const createVehicle = async (payload: IVehicle) => {

    const { vehicleLicense } = payload

    const isVehicleExist = await Vehicle.findOne({ vehicleLicense })


    if (isVehicleExist) {
        throw new AppError(400, "Vehicle already registered!!");
    }

    const newVehicle = await Vehicle.create(payload)
    return newVehicle
}

const updateVehicle = async (payload: IVehicle, vehicleId: string, decodedToken: JwtPayload) => {
    const vehicle = await Vehicle.findById(vehicleId)

    if (!vehicle) {
        throw new AppError(400, "Vehicle not found!!");
    }

    const vehicleOwner = vehicle.driver.toString();

    const isNotOwner = vehicleOwner !== decodedToken.userId
    const isNotAdmin = decodedToken.role !== Role.ADMIN || decodedToken.role !== Role.SUPER_ADMIN


    if (isNotOwner && isNotAdmin) {
        throw new AppError(403, "You are not authorized to update this vehicle")
    }

    if (payload.isDeleted) {
        if (isNotAdmin) {
            throw new AppError(403, "You are not authorized to delete!!")
        }
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, payload, { new: true, runValidators: true })

    return updatedVehicle
}

const getAllVehicle = async () => {
    const vehicles = await Vehicle.find({})

    return vehicles
}

const getSingleVehicle = async (vehicleId: string) => {
    const vehicles = await Vehicle.findById(vehicleId)

    return vehicles
}



export const vehicleService = {
    createVehicle,
    updateVehicle,
    getAllVehicle,
    getSingleVehicle
}