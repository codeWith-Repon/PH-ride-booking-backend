import { JwtPayload } from "jsonwebtoken";
import AppError from "../../app/errorHelpers/AppError";
import { IVehicle } from "./vehicle.interface";
import { Vehicle } from "./vehicle.model";
import { Role } from "../user/user.interface";
import { deleteImageFromCloudinary } from "../../config/cloudinary.config";


const createVehicle = async (payload: IVehicle, decodedToken: JwtPayload) => {

    const { vehicleLicense } = payload

    const isVehicleExist = await Vehicle.findOne({ vehicleLicense })


    if (isVehicleExist) {
        throw new AppError(400, "Vehicle already registered!!");
    }
    const vehiclePayload = {
        ...payload,
        driver: decodedToken.userId
    }
    const newVehicle = await Vehicle.create(vehiclePayload)
    return newVehicle
}

const updateVehicle = async (payload: IVehicle, vehicleId: string, decodedToken: JwtPayload) => {
    const existVehicle = await Vehicle.findById(vehicleId)

    if (!existVehicle) {
        throw new AppError(400, "Vehicle not found!!");
    }

    const vehicleOwner = existVehicle.driver.toString();

    const isOwner = vehicleOwner === decodedToken.userId
    const isAdmin = decodedToken.role === Role.ADMIN || decodedToken.role === Role.SUPER_ADMIN


    if (!isOwner && !isAdmin) {
        throw new AppError(403, "You are not authorized to update this vehicle")
    }

    if (payload.isDeleted) {
        if (!isAdmin) {
            throw new AppError(403, "You are not authorized to delete!!")
        }
    }

    if (payload.images && payload.images.length > 0 && existVehicle.images && existVehicle.images.length > 0) {
        payload.images = [...payload.images, ...existVehicle.images]
    }

    if (payload.deleteImages && payload.deleteImages.length > 0 && existVehicle.images && existVehicle.images.length > 0) {
        const restDBImages = existVehicle.images.filter(imageUrl => !payload.deleteImages?.includes(imageUrl))

        const updatedPayloadImages = (payload.images || [])
            .filter(imageUrl => !payload.deleteImages?.includes(imageUrl))
            .filter(imageUrl => !restDBImages?.includes(imageUrl))

        payload.images = [...restDBImages, ...updatedPayloadImages]
    }


    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, payload, { new: true, runValidators: true })

    if (payload.deleteImages && payload.deleteImages.length > 0 && existVehicle.images && existVehicle.images?.length > 0) {
        await Promise.all(payload.deleteImages.map(url => deleteImageFromCloudinary(url)))
    }

    return updatedVehicle
}

const getAllVehicle = async () => {
    const vehicles = await Vehicle.find({})

    return vehicles
}

const getSingleVehicle = async (vehicleId: string) => {
    const vehicles = await Vehicle.findById(vehicleId).populate("driver")

    return vehicles
}



export const vehicleService = {
    createVehicle,
    updateVehicle,
    getAllVehicle,
    getSingleVehicle
}