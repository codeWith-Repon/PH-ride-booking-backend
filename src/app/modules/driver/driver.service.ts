import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { IDriver } from "./driver.interface";
import { Driver } from "./driver.model";
import { Role } from "../user/user.interface";


const createDriver = async (payload: IDriver) => {
    const { user } = payload

    const existDriver = await Driver.findById(user)


    if (existDriver) {
        throw new AppError(400, "User already exists")
    }

    const newDriver = await Driver.create(payload)

    return newDriver
}

const updateDriver = async (driverId: string, decodedToken: JwtPayload, payload: IDriver) => {

    const existDriver = await Driver.findById(driverId)


    if (!existDriver) {
        throw new AppError(400, "Driver doesn't exists!!")
    }

    if (payload.isApproved !== undefined &&
        decodedToken.role !== Role.ADMIN &&
        decodedToken.role !== Role.SUPER_ADMIN) {
        throw new AppError(400, "You can not authorized to change approve status")
    }

    const updatedDriver = await Driver.findByIdAndUpdate(driverId, payload, { new: true, runValidators: true })

    return updatedDriver
}

const getAllDriver = async () => {

    const drivers = await Driver.find({})

    return drivers
}
const getSingleDriver = async (driverId: string) => {

    const driver = await Driver.findById(driverId).populate("user").populate("vehicle")

    return driver
}

export const driverService = {
    createDriver,
    updateDriver,
    getAllDriver,
    getSingleDriver
}