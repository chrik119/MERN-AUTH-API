const User = require('../models/user');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const _ = require('lodash');
const {OAuth2Client} = require('google-auth-library');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//SIGNUP W/O EMAIL VERIFICATION
{
// exports.signup = (req, res) => {
//     //Get Signup Info From Request
//     const {name, email, password} = req.body;

//     //Check if User is in DB W/O E-mail Varification
//     User.findOne({email: email}).exec((err, user) => {
//         if(user){
//             return res.status(400).json({
//                 error: 'Email Is Already Used'
//             });
//         } else {
//             let newUser = new User({name, email, password});
//             newUser.save((err, success) => {
//                 if(err){
//                     console.log('SIGNUP ERROR: ', err);
//                     return res.status(400).json({
//                         error: err
//                     });
//                 }
//                 res.json({
//                     message: 'Signup of ' + email + ' was successful'
//                 })
//             });
//         }
//     });
// };
}

//SIGNUP W/ EMAIL VERIFICATION
exports.signup = (req, res) => {
    const {name, email, password} = req.body;
    User.findOne({email: email}).exec((err, user) => {
        if(user){
            return res.status(400).json({
                error: 'Email Is Already Used'
            });
        } else {
            const token = jwt.sign({name, email, password}, process.env.JWT_ACCOUNT_ACTIVATION, {expiresIn: '1h'});
            const emailData = {
                from: process.env.EMAIL_FROM,
                to: email,
                subject: `Account activation link`,
                html: `
                    <h1>Please use the following link to activate your account</h1>
                    <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                    <hr />
                    <p>This E-mail May Contain Sensetive Information</p>
                    <p>${process.env.CLIENT_URL}
                `
            };
            sgMail.send(emailData)
            .then(sent => {
                console.log('SIGNUP EMAIL SENT', sent);
                return res.json({
                    message: `Email has been sent to ${email}. Follow instructions to activate your account.`
                });
            })
            .catch(err => {
                console.log(err.response.body);
            });
        }
    });

};

exports.accountActivation = (req, res) => {
    const {token} = req.body;
    if(token){
        jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded){
            if(err){
                console.log('JWT TOKEN ERROR: ', err);
                return res.status(401).json({
                    error: 'Expired Link, Signup again'
                });
            }
            const {name, email, password} = jwt.decode(token);
            let newUser = new User({name, email, password});
            newUser.save((err, success) => {
                if(err){
                    console.log('SAVE USER TO DB ERROR: ', err);
                    return res.status(401).json({
                        error: 'ERROR SAVING USER TO DATABASAE, TRY TO SIGNUP AGAIN'
                    });
                }
                return res.json({
                    message: 'Signup of ' + email + ' was successful'
                });
            });
        });
    } else {
        return res.json({
            message: 'Something went wrong. Try again'
        });
    }
};

exports.signin = (req, res) => {
    const {email, password} = req.body;
    User.findOne({email}).exec((err, user) => {
        if(err || !user){
            return res.status(400).json({
                error: 'User with that email does not exist. Please sign up'
            });
        }
        if(!user.authenticate(password)){
            return res.status(400).json({
                error: 'Email and password do not match. Please try again'
            });
        }
        const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn:'7d'});
        const {_id, name, email, role} = user;

        return res.json({
            token,
            user: {_id, name, email, role}
        })
    });

};

exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256']
});

exports.adminMidddleware = (req, res, next) => {
    //Requires requireSignin First!!!
    User.findById(req.user._id).exec((err, user) => {
        if(err || !user){
            return res.status(400).json({
                error: 'User not found'
            });
        }
        if(user.role !== 'admin'){
            return res.status(400).json({
                error: 'Admin Resource. Access Denied'
            });
        }
        req.profile = user;
        next();
    });
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;

    User.findOne({email}, (err, user) => {
        if(err || !user){
            return res.status(400).json({
                error: "User with that email does not exist"
            });
        } else {
            const token = jwt.sign({_id: user._id, name: user.name}, process.env.JWT_RESET_PASSWORD, {expiresIn: '1h'});
            const emailData = {
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject: `Reset Password Link`,
                html: `
                    <h1>Please use the following link to reset your password</h1>
                    <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                    <hr />
                    <p>This E-mail May Contain Sensetive Information</p>
                    <p>${process.env.CLIENT_URL}
                `
            };

            return user.updateOne({resetPasswordLink: token}, (err, success) => {
                if(err){
                    console.log("Update reset token error", err);
                    return res.status(400).json({
                        error: 'Database connection error on user forgot password request'
                    });
                }
                sgMail.send(emailData)
                .then(sent => {
                    console.log('RESET PASSWORD EMAIL SENT', sent);
                    return res.json({
                        message: `Email has been sent to ${email}. Follow instructions to reset your password.`
                    });
                })
                .catch(err => {
                    console.log(err.response.body);
                });
            });

            
        }
    });
};

exports.resetPassword = (req, res) => {
    const {resetPasswordLink, newPassword} = req.body;
    if(resetPasswordLink){
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, (err, decoded) => {
            if(err){
                return res.status(400).json({
                    error: "Expired Link, Try Again"
                });
            }
            User.findOne({resetPasswordLink}, (err, user) => {
                if(err || !user){
                    return res.status(400).json({
                        error: "Soomething went wrong. Try later"
                    });
                }
                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                };
                user = _.extend(user, updatedFields);
                user.save((err, result) => {
                    if(err){
                        return res.status(400).json({
                            error: "Error updating user password"
                        });
                    }
                    res.json({
                        message: `You can now login with your new password!`
                    });
                });
            });
        });
    }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
    const {idToken} = req.body;
    client.verifyIdToken({idToken, audience:process.env.GOOGLE_CLIENT_ID}).then(response => {
        const {email_verified, name, email} = response.payload;
        if(email_verified){
            User.findOne({email}).exec((err, user) => {
                if(user){
                    const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                    const {_id, name, email, role} = user;
                    return res.json({
                        token, 
                        user: {_id, name, email, role}
                    });
                } else {
                    let password = email + process.env.JWT_SECRET;
                    user = new User({name, email, password});
                    user.save((err, data) => {
                        if(err){
                            console.log('ERROR GOOGLE LOGIN USER SAVE', err);
                            return res.status(400).json({
                                error: 'User signup failed with Google'
                            });
                        }
                        const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'});
                        const {_id, name, email, role} = data;
                        return res.json({
                            token, 
                            user: {_id, name, email, role}
                        });
                    });
                }
            });
        } else {
            console.log('GOOGLE LOGIN FAILED', err);
            return res.status(400).json({
                error: 'Google Login Failed, Try Again'
            });
        }
    });
};