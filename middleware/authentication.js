import CustomErrors from "../errors/index.js";
import Utils from "../utils/index.js";
import Token from "../models/Token.js";

const authenticateUser = async (req, res, next) => {
	const { refreshToken, accessToken } = req.signedCookies;

	// rmb, this is a middleware function so you need next() in order to pass to the
	// controllers in  routes.js
	try {
		if (accessToken) {
			const payload = Utils.isTokenValid(accessToken);
			req.user = payload.user;
			return next();
		}

		// after checking for accessToken, if it exists, check for refreshToken immediately
		const payload = Utils.isTokenValid(refreshToken);

		// this existingToken refers to the 'old' refreshToken
		// there is a existingToken.refreshToken as back in attachCookiesToResponse, under
		// const refreshTokenJWT = createJWT({payload: {user, refreshToken}})
		const existingToken = await Token.findOne({
			user: payload.user.userId,
			refreshToken: payload.refreshToken,
		});

		// basically checking if it does not exist and if does exist, what is the value of isValid
		// and if both false, then the error
		if (!existingToken || !existingToken?.isValid) {
			throw new CustomErrors.UnauthenticatedError(
				"Authentication Invalid"
			);
		}

		// this is if the existingToken does exist, then instead of payload.refreshToken, you take the
		// existingToken.refreshToken
		Utils.jwtValidation.attachCookiesToResponse({
			res,
			user: payload.user,
			refreshToken: existingToken.refreshToken,
		});

		req.user = payload.user;
		next();
	} catch (error) {
		throw new CustomErrors.UnauthenticatedError("Authentication Invalid");
	}
};

const authorizePermissions = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			throw new CustomErrors.UnauthorizedError(
				"Unauthorized to access this route"
			);
		}
		next();
	};
};

export default {
	authenticateUser,
	authorizePermissions,
};

/*
Questions:

1. next() vs return next() 

In the provided authenticateUser middleware, next() and return next() both serve to call the next middleware function in the chain. However, the key difference between them lies in their behavior.

The next() function simply calls the next middleware in the chain and continues executing the current middleware function. In this case, after setting the req.user object, the current middleware function will continue to execute any code following the next() call, which may include additional middleware or endpoint logic.

On the other hand, return next() stops the execution of the current middleware function and immediately passes control to the next middleware in the chain, skipping any subsequent code in the current function.

In the provided code, using next() after setting the req.user object will allow subsequent middleware or endpoint logic to access this information. In contrast, using return next() would skip any subsequent code in the authenticateUser function.

It's worth noting that both approaches are valid and may be used depending on the specific requirements of the application.

To clarify, if next() is the last middleware in the chain, then there is no functional difference between using next() and return next() in the authenticateUser middleware.

However, if there is additional code following the next() call, the decision to use return next() or not would depend on whether you want to execute that code or not. This may be determined by a specific condition, such as checking for an error or verifying permissions.

In summary, the choice to use return next() or not in this situation depends on the specific needs of the application and the desired behavior of the middleware.


2. Why we need to attachCookiesToResponse in authenticateUser

We're attaching both refreshToken and accessToken when the user logs-in, but, since the expiration of the accessToken is very short, let's say 15 minutes, it means that after this period of time accessToken will expire and the only cookie that will be there is that refreshToken.
Now, I know, you might be thinking "Ok, but why don't we authenticate the user with that refreshToken that we still have, why are we creating a new accessToken?"

The refreshToken is not meant to be used for authentication; its purpose is to obtain a new accessToken when the current one expires. When the accessToken expires, the client sends the refreshToken to the server to obtain a new accessToken.

In the authenticateUser middleware, we check if there is an access token or a refresh token. If there is an access token, we validate it and use its payload to set the req.user object, which will be used in subsequent middleware and controllers.

If there is no access token, we assume that the client is trying to obtain a new access token using the refresh token. In this case, we validate the refresh token and use its payload to create a new access token. We also attach the new refresh token to the response, so the client can use it to obtain another new access token when the current one expires.
*/
