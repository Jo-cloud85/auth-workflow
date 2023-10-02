import User from "../models/User.js";
import Token from "../models/Token.js";
import { StatusCodes } from "http-status-codes";
import CustomErrors from "../errors/index.js";
import Utils from "../utils/index.js";
import crypto from "crypto";

// first registered user is an admin
const register = async (req, res) => {
	const { email, name, password } = req.body;

	const emailAlreadyExists = await User.findOne({ email });
	if (emailAlreadyExists) {
		throw new CustomErrors.BadRequestError("Email already exists");
	}

	// first registered user is an admin
	const isFirstAccount = (await User.countDocuments({})) === 0;
	const role = isFirstAccount ? "admin" : "user";

	// essentially, crypto.randomBytes creates a buffer
	const verificationToken = crypto.randomBytes(40).toString("hex");

	const user = await User.create({
		name,
		email,
		password,
		role,
		verificationToken,
	});

	const origin = "http://localhost:3000";

	// const protocol = req.protocol;
	// console.log(`protocol: ${protocol}`);
	// const host = req.get('host')
	// console.log(`host: ${host}`);

	// const forwardedHost = req.get('x-forwarded-host');
	// const forwardedProtocol = req.get('x-forwarded-proto');
	// console.log(`forwarded host: ${forwardedHost}`);
	// console.log(`forwarded protocol: ${forwardedProtocol}`);

	await Utils.sendVerificationEmail({
		name: user.name,
		email: user.email,
		verificationToken: user.verificationToken,
		origin,
	});

	// send verification token back is only for testing in postman !!!
	res.status(StatusCodes.CREATED).json({
		msg: "Success! Please check your email to verify account",
		verificationToken,
	});
};

// verify email before allowing successful login
const verifyEmail = async (req, res) => {
	// verificationToken and email will be send here from the front-end
	const { verificationToken, email } = req.body;
	const user = await User.findOne({ email });

	if (!user) {
		throw new CustomErrors.UnauthenticatedError("Verification Failed");
	}

	if (user.verificationToken !== verificationToken) {
		throw new CustomErrors.UnauthenticatedError("Verification Failed");
	}

	(user.isVerified = true), (user.verified = Date.now());

	// basically, after user is verified once, you remove/empty the verificationToken
	user.verificationToken = "";

	await user.save();

	res.status(StatusCodes.OK).json({ msg: "Email Verified" });
};

// login w/ check for refresh token
const login = async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		throw new CustomErrors.BadRequestError(
			"Please provide email and password"
		);
	}

	const user = await User.findOne({ email });
	if (!user) {
		throw new CustomErrors.UnauthenticatedError("Invalid Credentials");
	}

	const isPasswordCorrect = await user.comparePassword(password);
	if (!isPasswordCorrect) {
		throw new CustomErrors.UnauthenticatedError("Invalid Credentials");
	}

	// the property 'isVerified' comes from UserSchema
	if (!user.isVerified) {
		throw new CustomErrors.UnauthenticatedError("Please verify your email");
	}

	const tokenUser = Utils.createTokenUser(user);

	// create refresh token
	let refreshToken = "";
	// check for existing token
	const existingToken = await Token.findOne({ user: user._id });

	if (existingToken) {
		const { isValid } = existingToken;
		if (!isValid) {
			throw new CustomErrors.UnauthenticatedError("Invalid Credentials");
		}
		refreshToken = existingToken.refreshToken;

		Utils.jwtValidation.attachCookiesToResponse({
			res,
			user: tokenUser,
			refreshToken,
		});

		res.status(StatusCodes.OK).json({ user: tokenUser });

		return;
	}

	// essentially, crypto.randomBytes creates a buffer
	refreshToken = crypto.randomBytes(40).toString("hex");

	const userAgent = req.headers["user-agent"];
	const ip = req.ip;
	const userToken = { refreshToken, ip, userAgent, user: user._id };

	await Token.create(userToken);

	Utils.jwtValidation.attachCookiesToResponse({
		res,
		user: tokenUser,
		refreshToken,
	});

	res.status(StatusCodes.OK).json({ user: tokenUser });
};

const logout = async (req, res) => {
	await Token.findOneAndDelete({ user: req.user.userId });

	res.cookie("accessToken", "logout", {
		httpOnly: true,
		expires: new Date(Date.now()),
	});

	res.cookie("refreshToken", "logout", {
		httpOnly: true,
		expires: new Date(Date.now()),
	});

	res.status(StatusCodes.OK).json({ msg: "user logged out!" });
};

const forgotPassword = async (req, res) => {
	const { email } = req.body;
	if (!email) {
		throw new CustomErrors.BadRequestError("Please provide valid email");
	}

	const user = await User.findOne({ email });
	if (user) {
		const passwordToken = crypto.randomBytes(70).toString("hex");

		// send email
		const origin = "http://localhost:3000";

		await Utils.sendResetPasswordEmail({
			name: user.name,
			email: user.email,
			token: passwordToken,
			origin,
		});

		const tenMinutes = 1000 * 60 * 10;
		const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

		user.passwordToken = Utils.createHash(passwordToken);
		user.passwordTokenExpirationDate = passwordTokenExpirationDate;
		await user.save();
	}

	res.status(StatusCodes.OK).json({
		msg: "Please check you email for reset password link",
	});
};

const resetPassword = async (req, res) => {
	const { token, email, password } = req.body;

	if (!token || !email || !password) {
		throw new CustomErrors.BadRequestError("Please provide all values");
	}

	const user = await User.findOne({ email });
	if (user) {
		const currentDate = new Date();
		if (
			user.passwordToken === Utils.createHash(token) &&
			user.passwordTokenExpirationDate > currentDate
		) {
			user.password = password;
			user.passwordToken = null;
			user.passwordTokenExpirationDate = null;
			await user.save();
		}
	}
};

export default {
	register,
	login,
	logout,
	verifyEmail,
	forgotPassword,
	resetPassword,
};
