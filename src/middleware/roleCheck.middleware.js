import { ApiError } from "../utils/ApiError.js";

const allowRoles = (...roles) => {
  try {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        throw new ApiError (403, "User is not Allowed")
      }
      next();
    };
  } catch (error) {
    throw new ApiError (400, error?.message || "Role Check Failed")
  }
};

export { allowRoles }