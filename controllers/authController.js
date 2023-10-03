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

	// once in production, change this URL to the one that is hosted e.g. on render
	const origin = "http://localhost:3000";

	// this is just to show the things you can get from the request object
	// const tempOrigin = req.get('origin');
	// console.log(`origin: ${tempOrigin}`); // http://localhost:5000 - where the req is coming from
	// const protocol = req.protocol;
	// console.log(`protocol: ${protocol}`); // http
	// const host = req.get('host')
	// console.log(`host: ${host}`); // localhost:5000

	// const forwardedHost = req.get('x-forwarded-host');
	// const forwardedProtocol = req.get('x-forwarded-proto');
	// console.log(`forwarded host: ${forwardedHost}`); // localhost:3000
	// console.log(`forwarded protocol: ${forwardedProtocol}`); // http

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

	// check for existing token is necessary because you don't want a situation when a new token
	// is generated whenever the same user logs in. This existing token is like an id for tokens.
	const existingToken = await Token.findOne({ user: user._id });

	if (existingToken) {
		const { isValid } = existingToken; // rmb there's a isValid property (default: true) on TokenSchema
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

	refreshToken = crypto.randomBytes(40).toString("hex");
	// you can also use req.get to get user-agent like how you get the host, protocol etc.
	// you need to extract user-agent and ip from req because in TokenSchema, they are one of the
	// properties so you need then in order to create a new token using Token.create()
	const userAgent = req.headers["user-agent"];
	const ip = req.ip;
	// you dont have to put in isValid as there is a default value in TokenSchema
	const userToken = { refreshToken, ip, userAgent, user: user._id };

	await Token.create(userToken);

	Utils.jwtValidation.attachCookiesToResponse({
		res,
		user: tokenUser,
		refreshToken,
	});

	res.status(StatusCodes.OK).json({ user: tokenUser });
};

// ensure both tokens are removed but first we need to attach user
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

	// again, the msg is more for postman as an indication that the functionality is successful
	// the frontend does not need this msg
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

		// origin is pointing to the frontend
		const origin = "http://localhost:3000";

		// send email for reset password link
		await Utils.sendResetPasswordEmail({
			name: user.name,
			email: user.email,
			token: passwordToken,
			origin,
		});

		const tenMinutes = 1000 * 60 * 10;
		const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

		// user.passwordToken and user.passwordTokenExpirationDate come from UserSchema
		user.passwordToken = Utils.createHash(passwordToken);
		user.passwordTokenExpirationDate = passwordTokenExpirationDate;
		await user.save();
	}

	// whether or not the user exist, you still send this success response to prevent attacker
	// from trying out some random email and realised that the user does not exist
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
		// check for today's date first because the password token has expiry
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
