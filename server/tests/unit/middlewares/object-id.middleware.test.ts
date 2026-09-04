import { describe, expect, it, vi } from "vitest";
import { validateObjectId } from "../../../src/middlewares/object-id.middleware";
import { AppError } from "../../../src/errors/AppError";
import { HttpStatus } from "../../../src/constants/http-status";

describe("validateObjectId", () => {
  it("allows a valid ObjectId and calls next", () => {
    const next = vi.fn();
    const middleware = validateObjectId("id");

    middleware(
      { params: { id: "507f1f77bcf86cd799439011" } } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects an invalid ObjectId with 400 before next", () => {
    const next = vi.fn();
    const middleware = validateObjectId("id");

    expect(() =>
      middleware({ params: { id: "abc" } } as never, {} as never, next),
    ).toThrowError(AppError);

    try {
      middleware({ params: { id: "abc" } } as never, {} as never, next);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(HttpStatus.BAD_REQUEST);
    }

    expect(next).not.toHaveBeenCalled();
  });

  it("validates multiple route parameters", () => {
    const next = vi.fn();
    const middleware = validateObjectId("companyId", "employeeId");

    middleware(
      {
        params: {
          companyId: "507f1f77bcf86cd799439011",
          employeeId: "507f191e810c19729de860ea",
        },
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
