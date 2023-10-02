import sendEmail from "./sendEmail.js";

const sendVerificationEmail = async ({
	name,
	email,
	verificationToken,
	origin,
}) => {
	// this url links to the frontend and this route /user/verify-email needs to be on the frontend
	// (go check App.js under one of the <Route></Route>)
	// origin is basically localhost:3000 where your frontend is
	const verifyEmail = `${origin}/user/verify-email?token=${verificationToken}&email=${email}`;

	const message = `<p>Please confirm your email by clicking on the following link: 
            <a href="${verifyEmail}">Verify Email</a>
        </p>`;

	return sendEmail({
		to: email,
		subject: "Email Confirmation",
		html: `<h4>Hello, ${name}</h4>${message}`,
	});
};

export default sendVerificationEmail;
