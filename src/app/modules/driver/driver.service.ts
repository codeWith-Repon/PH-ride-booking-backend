import AppError from "../../errorHelpers/AppError";
import { IDriver } from "./driver.interface";
import { Driver } from "./driver.model";


const createDriver = async (payload: IDriver) => {
    const { driver } = payload

    const existDriver = await Driver.findById(driver)


    if (existDriver) {
        throw new AppError(400, "Driver already exists")
    }

    const newDriver = await Driver.create(payload)

    return newDriver
}

const updateDriver = async (payload: IDriver) => {
    const { driver } = payload

    const existDriver = await Driver.findById(driver)


    if (existDriver) {
        throw new AppError(400, "Driver already exists")
    }

    const newDriver = await Driver.create(payload)

    return newDriver
}

export const driverService = {
    createDriver,
    updateDriver
}