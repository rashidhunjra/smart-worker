// middlewares/verifyToken.js
const jwt = require("jsonwebtoken");
const {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} = require("../config/index");

const verifyToken = (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    return next(); // Valid access token
  } catch (err) {
    // Access token expired, try refresh token
    if (err.name === "TokenExpiredError" && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        // Issue new access token
        const newAccessToken = jwt.sign(
          { _id: decoded._id },
          ACCESS_TOKEN_SECRET,
          {
            expiresIn: "1h",
          }
        );

        res.cookie("accessToken", newAccessToken, {
          maxAge: 1000 * 60 * 60,
          httpOnly: true,
        });

        req.user = decoded;
        return next();
      } catch (refreshErr) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    }

    return res.status(401).json({ message: "Invalid access token" });
  }
};

module.exports = verifyToken;
