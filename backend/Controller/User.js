
const User = require("../Model/User");
const OTP = require("../Model/OTP");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Remove any previous OTP for this email
    await OTP.deleteMany({ email });

    // Save the new OTP
    const otpData = new OTP({
      email,
      otp,
    });

    await otpData.save();

    // Send OTP using Resend HTTPS API
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SkillBazar <onboarding@resend.dev>",
          to: [email],
          subject: "SkillBazar OTP",
          text: `Your SkillBazar OTP is ${otp}. It is valid for 5 minutes.`,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend email error:", result);

      // Remove the OTP if the email could not be sent
      await OTP.deleteMany({ email });

      throw new Error(
        result.message || "Failed to send OTP email"
      );
    }

    console.log("OTP email sent successfully:", email);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (e) {
    console.error("OTP sending failed:", e.message);

    return res.status(500).json({
      success: false,
      message: "OTP sending failed",
      data: e.message,
    });
  }
};

// Verify OTP and Register User
exports.verifyOTP = async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    const otpData = await OTP.findOne({
      email,
      otp,
    });

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const response = await user.save();

    // Delete OTP after successful registration
    await OTP.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: "User registered successfully",
      data: response,
    });
  } catch (e) {
    console.error("Registration failed:", e.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      data: e.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    const options = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };

    res.cookie("token", token, options);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("Login failed:", e.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      data: e.message,
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (e) {
    console.error("Logout failed:", e.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
      data: e.message,
    });
  }
};
