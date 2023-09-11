import CustomErrors from '../errors/index.js';
import Utils from '../utils/index.js';
import Token from '../models/Token.js'

const authenticateUser = async (req, res, next) => {
    const { refreshToken, accessToken } = req.signedCookies;

    try {
        if (accessToken) {
            const payload = Utils.isTokenValid(accessToken);
            req.user = payload.user
            return next()
        }
        const payload = Utils.isTokenValid(refreshToken);

        const existingToken = await Token.findOne({
            user: payload.user.userId,
            refreshToken: payload.refreshToken
        })

        if (!existingToken || !existingToken?.isValid) {
            throw new CustomErrors.UnauthenticatedError('Authentication Invalid');
        }

        Utils.jwtValidation.attachCookiesToResponse({ 
            res, user:payload.user, 
            refreshToken:existingToken.refreshToken 
        })

        req.user = payload.user;
        next();

    } catch (error) {
        throw new CustomErrors.UnauthenticatedError('Authentication Invalid');
    }
};

const authorizePermissions = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new CustomErrors.UnauthorizedError('Unauthorized to access this route');
        }
        next();
    };
};

export default {
    authenticateUser,
    authorizePermissions,
};
