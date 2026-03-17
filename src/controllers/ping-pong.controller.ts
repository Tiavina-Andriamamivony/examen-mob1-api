import { Request, Response } from 'express';

export const pong = (req: Request, res: Response): void => {
    res.status(200).json({ message: 'pong!' });
};