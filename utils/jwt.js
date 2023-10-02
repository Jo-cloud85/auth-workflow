import jwt from "jsonwebtoken";

// When working w/ cookies, you need not an expiry for JWT token as the cookies will take care of that
const createJWT = ({ payload }) => {
	const token = jwt.sign(payload, process.env.JWT_SECRET);
	return token;
};

const isTokenValid = (token) => jwt.verify(token, process.env.JWT_SECRET);

/* Essentially, accessToken is for access only so it should have a very short expiry/age. However, 
When the user is logged in, you don't want the user to be logged out after the accessToken expires and 
get removed from the cookies. This is where refreshToken comes in. It is also created alongside the 
accessToken and stays in the cookies as long as the user stays logged in. If you refresh the page, the accessToken is re-attached to the cookies so you wont be log out as well because you refresh. */

const attachCookiesToResponse = ({ res, user, refreshToken }) => {
	const accessTokenJWT = createJWT({ payload: { user } });
	const refreshTokenJWT = createJWT({ payload: { user, refreshToken } });

	const oneDay = 1000 * 60 * 60 * 24;

	res.cookie("accessToken", accessTokenJWT, {
		httpOnly: true,
		// expires: new Date(Date.now() + oneDay),
		secure: process.env.NODE_ENV === "production",
		signed: true,
		maxAge: 1000 * 60 * 15, //1000 means 1 sec
	});

	res.cookie("refreshToken", refreshTokenJWT, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		signed: true,
		expires: new Date(Date.now() + oneDay),
	});
};

// const attachSingleCookieToResponse = ({ res, user }) => {
//     const token = createJWT({ payload: user });

//     const oneDay = 1000 * 60 * 60 * 24;

//     res.cookie('token', token, {
//         httpOnly: true,
//         expires: new Date(Date.now() + oneDay),
//         secure: process.env.NODE_ENV === 'production',
//         signed: true,
//     });
// };

export default {
	createJWT,
	isTokenValid,
	attachCookiesToResponse,
};
