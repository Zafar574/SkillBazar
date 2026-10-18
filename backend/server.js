require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

const dbConnect = require("./Config/database");

const userRoutes = require("./Routes/User");
const categoryRoutes = require("./Routes/Category");
const courseRoutes = require("./Routes/Course");
const enrollmentRoutes = require("./Routes/Enrollment");
const paymentRoutes = require("./Routes/Payment");

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(
  fileUpload({
    useTempFiles: true,

    tempFileDir: "/tmp/",
  }),
);

app.use(
  cors({
    origin: "https://skill-bazar-plum.vercel.app",
    //origin:"http://localhost:5173",
    credentials: true,
  }),
);

dbConnect();

// User Routes

app.use("/api/v1/user", userRoutes);

// Category Routes

app.use("/api/v1/category", categoryRoutes);

// Course Routes

app.use("/api/v1/course", courseRoutes);

// Enrollment Routes

app.use("/api/v1/enrollment", enrollmentRoutes);

// Payment Routes

app.use("/api/v1/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send("SkillBazar Server Running");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
