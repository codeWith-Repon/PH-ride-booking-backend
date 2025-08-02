/* eslint-disable @typescript-eslint/no-explicit-any */

import { TGenericErrorResponse } from "../interfaces/error.types"


export const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const fieldName = Object.keys(err.keyPattern || {})[0];
  const duplicateValue = err.keyValue ? err.keyValue[fieldName] : "";

  return {
    statusCode: 400,
    message: `${fieldName} '${duplicateValue}' already exists!`,
  };
};