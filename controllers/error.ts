import { NextFunction, Request, Response } from "express";

export class CustomError extends Error {
	statusCode: number;
	customError: boolean;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
		this.customError = true;
	}
}

export function handleError(
	err: CustomError | Error,
	_: Request,
	res: Response,
	__: NextFunction
) {
	if ((err as CustomError).customError) {
		return res.status((err as CustomError).statusCode).json({
			success: false,
			message: err.message
		});
	}
	res.status(400).json({
		success: false,
		message: err.message
	});
}
