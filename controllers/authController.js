import User from '../models/User.js';
import Token from '../models/Token.js';
import { StatusCodes } from 'http-status-codes';
import CustomErrors from '../errors/index.js';
import Utils from '../utils/index.js';
import crypto from 'crypto';

const register = async (req, res) => {
    const { email, name, password } = req.body;

    const emailAlreadyExists = await User.findOne({ email });
    if (emailAlreadyExists) {
        throw new CustomErrors.BadRequestError('Email already exists');
    }

    // first registered user is an admin
    const isFirstAccount = (await User.countDocuments({})) === 0;
    const role = isFirstAccount ? 'admin' : 'user';

    const verificationToken = crypto.randomBytes(40).toString('hex');
    
    const user = await User.create({ 
        name, 
        email, 
        password, 
        role, 
        verificationToken 
    });

    const origin = 'http://localhost:3000';

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
        origin
    });
   
    // send verification token back only while testing in postman
    res.status(StatusCodes.CREATED).json({
        msg: 'Success! Please check your email to verify account',
        verificationToken
    })
};


const verifyEmail = async (req, res) => {
    const { verificationToken, email } = req.body;
    const user = await User.findOne({ email });
    
    if(!user) {
        throw new CustomErrors.UnauthenticatedError('Verification Failed');
    }

    if(user.verificationToken !== verificationToken) {
        throw new CustomErrors.UnauthenticatedError('Verification Failed');
    }

    (user.isVerified = true),
    (user.verified = Date.now())
    user.verificationToken = ''

    await user.save()

    res.status(StatusCodes.OK).json({ msg: 'Email Verified' });
}


const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new CustomErrors.BadRequestError('Please provide email and password');
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new CustomErrors.UnauthenticatedError('Invalid Credentials');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new CustomErrors.UnauthenticatedError('Invalid Credentials');
    }

    if (!user.isVerified) {
        throw new CustomErrors.UnauthenticatedError('Please verify your email');
    }

    const tokenUser = Utils.createTokenUser(user);

    // create refresh token
    let refreshToken = '';
    // check for existing token
    const existingToken = await Token.findOne({ user: user._id })

    if (existingToken) {
        const { isValid } = existingToken
        if(!isValid) {
            throw new CustomErrors.UnauthenticatedError('Invalid Credentials');
        }
        refreshToken = existingToken.refreshToken

        Utils.jwtValidation.attachCookiesToResponse({ res, user: tokenUser, refreshToken });

        res.status(StatusCodes.OK).json({ user: tokenUser });

        return;
    }


    refreshToken = crypto.randomBytes(40).toString('hex')
    const userAgent = req.headers['user-agent']
    const ip = req.ip
    const userToken = { refreshToken, ip, userAgent, user:user._id }

    await Token.create(userToken);

    Utils.jwtValidation.attachCookiesToResponse({ res, user: tokenUser, refreshToken });

    res.status(StatusCodes.OK).json({ user: tokenUser });
};


const logout = async (req, res) => {
    res.cookie('token', 'logout', {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.status(StatusCodes.OK).json({ msg: 'user logged out!' });
};


export default {
    register,
    login,
    logout,
    verifyEmail
};
