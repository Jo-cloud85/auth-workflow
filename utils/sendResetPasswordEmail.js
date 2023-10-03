import sendEmail from "./sendEmail.js";

const sendResetPasswordEmail = async ({ name, email, token, origin }) => {
	// this url links to the frontend and this route /user/reset-password needs to be on the frontend
	// (go check App.js under one of the <Route></Route>)
	// origin is basically localhost:3000 where your frontend is
	const resetURL = `${origin}/user/reset-password?token=${token}&email=${email}`;

	const message = `<p>Please reset password by clicking on the following link: 
        <a href="${resetURL}">Reset Password</a>
    </p>`;

	return sendEmail({
		to: email,
		subject: "Reset your password",
		htmlMessage: `<h4>Hello, ${name}</h4>
            ${message}`,
	});
};

export default sendResetPasswordEmail;
