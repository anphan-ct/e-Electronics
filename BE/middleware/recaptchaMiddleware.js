const axios = require("axios");

const verifyRecaptcha = async (req, res, next) => {
  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ message: "Vui lòng xác nhận bạn không phải robot!" });
  }

  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: recaptchaToken,
        },
      }
    );

    const { success, "error-codes": errorCodes } = response.data;

    if (!success) {
      console.log("reCAPTCHA thất bại:", errorCodes);
      return res.status(400).json({ message: "Xác minh reCAPTCHA thất bại. Vui lòng thử lại!" });
    }

    next();
  } catch (err) {
    console.error("Lỗi kết nối reCAPTCHA:", err.message);
    return res.status(500).json({ message: "Lỗi xác minh reCAPTCHA, vui lòng thử lại sau!" });
  }
};

module.exports = verifyRecaptcha;