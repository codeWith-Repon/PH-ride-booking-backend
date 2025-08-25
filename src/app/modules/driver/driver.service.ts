import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { IDriver } from "./driver.interface";
import { Driver } from "./driver.model";
import { Role } from "../user/user.interface";
import { Vehicle } from "../vehicle/vehicle.model";
import { QueryBuilder } from "../../utils/QueryBuilder";


const createDriver = async (payload: IDriver) => {
    const { user, vehicle } = payload

    const existDriver = await Driver.findOne({ user })


    if (existDriver) {
        throw new AppError(400, "Driver profile already exists.");
    }

    const driverVehicle = await Driver.findOne({ vehicle })

    if (driverVehicle) {
        throw new AppError(400, "This vehicle is already assigned to another driver.")
    }

    const isVehicleExist = await Vehicle.findById(vehicle)

    if (!isVehicleExist) {
        throw new AppError(400, "Vehicle is not exist!!")
    }
    const newDriver = (await (await Driver.create(payload)).populate("user", "name email")).populate("vehicle", "vehicleType brand model images vehicleLicense")

    return newDriver
}

// const changeDriverStatus = async (driverId: string, decodedToken: JwtPayload, payload: IDriver) => {
//     const { role } = decodedToken

//     if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
//         throw new AppError(403, "You are not authorize to change driver status.")
//     }

//     const updatedDriver = await Driver.findOneAndUpdate(
//         { user: driverId },
//         payload,
//         { new: true, runValidators: true }
//     )

//     return updatedDriver

// }


const updateDriver = async (driverId: string, decodedToken: JwtPayload, payload: IDriver) => {

    const existDriver = await Driver.findById(driverId)


    if (!existDriver) {
        throw new AppError(400, "Driver doesn't exists!!")
    }

    if (payload.status !== undefined &&
        decodedToken.role !== Role.ADMIN &&
        decodedToken.role !== Role.SUPER_ADMIN) {
        throw new AppError(400, "You can not authorized to change approve status")
    }

    const updatedDriver = await Driver.findByIdAndUpdate(driverId, payload, { new: true, runValidators: true })

    return updatedDriver
}

const getAllDriver = async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Driver.find(), query)
    const drivers = await queryBuilder
        .filter()
        .sort()
        .fields()
        .paginate()
        .populate("user","name email isActive")
        .populate("vehicle", "vehicleType brand model images vehicleLicense")

    const [data, meta] = await Promise.all([
        drivers.build(),
        queryBuilder.getMeta()
    ])

    return {
        data,
        meta
    }
}
const getSingleDriver = async (driverId: string) => {

    const driver = await Driver.findById(driverId).populate("user").populate("vehicle")

    return driver
}

export const driverService = {
    createDriver,
    // changeDriverStatus,
    updateDriver,
    getAllDriver,
    getSingleDriver
}