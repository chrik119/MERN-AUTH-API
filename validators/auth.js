const {check} = require('express-validator');

exports.userSignupValidator = [
    check('name')
    .notEmpty()
    .withMessage('Name is required'),
    check('email')
    .isEmail()
    .withMessage('Must Be Valid E-mail Address'),
    check('password')
    .isLength({min: 6})
    .withMessage('Password Must Be At Least 6 Characters Long')
];

exports.userSigninValidator = [
    check('email')
    .isEmail()
    .withMessage('Must Be Valid E-mail Address'),
    check('password')
    .isLength({min: 6})
    .withMessage('Password Must Be At Least 6 Characters Long')
];

exports.forgotPasswordValidator = [
    check('email')
    .notEmpty()
    .isEmail()
    .withMessage('Must Be Valid E-mail Address')
];

exports.resetPasswordValidator = [
    check('newPassword')
    .notEmpty()
    .isLength({min: 6})
    .withMessage('Password mussst be at least 6 characters long')
];