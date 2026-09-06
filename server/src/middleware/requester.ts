import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { RequesterUser } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  requester?: RequesterUser;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

export async function requireRequester(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const requesterIdHeader = req.headers["x-requester-id"];

  if (!requesterIdHeader || typeof requesterIdHeader !== "string") {
    res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Development requester identification required",
      },
    });
    return;
  }

  const requesterId = parseInt(requesterIdHeader, 10);
  if (isNaN(requesterId) || requesterId <= 0) {
    res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Development requester identification required",
      },
    });
    return;
  }

  try {
    const requester = await prisma.requesterUser.findFirst({
      where: {
        id: requesterId,
        isActive: true,
      },
    });

    if (!requester) {
      res.status(401).json({
        error: {
          code: "AUTH_REQUIRED",
          message: "Development requester identification required",
        },
      });
      return;
    }

    req.requester = requester;
    next();
  } catch (error) {
    res.status(500).json({
      error: {
        code: "UNEXPECTED",
        message: "Failed to verify requester identity",
      },
    });
  }
}
