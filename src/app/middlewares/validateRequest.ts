/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

const validateRequest =
    (schema: ZodObject<any>) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (req.body.data) {
                    req.body = JSON.parse(req.body.data)
                }
                req.body = await schema.parseAsync(req.body)
                next();
            } catch (error) {
                next(error);
            }
        };

export default validateRequest;
