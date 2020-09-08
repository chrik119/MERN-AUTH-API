const User = require('../models/user');

exports.read = (req, res) => {
    const userId = req.params.id;
    User.findById(userId).exec((err, user) => {
        if(err || !user){
            return res.status(400).json({
                error: 'User not found'
            });
        }
        user.hashedPassword = undefined;
        user.salt = undefined;
        res.json(user);
    });
};

exports.update = (req, res) => {
    const {name, password} = req.body;
    User.findById(req.user._id, (err, user) => {
        if(err || !user){
            return res.status(400).json({
                error: 'User not found'
            });
        }
        if(!name){
            return res.status(400).json({
                error: 'Name is required'
            });
        } else {
            user.name = name;
        }

        if(password){
            if(password.length < 6){
                return res.status(400).json({
                    error: 'Password must be at leasts 6 characters long'
                });
            } else {
                user.password = password;
            }
        }

        user.save((err, updatedUser) => {
            if(err){
                console.log('USER UPDATE ERROR', err);
                return res.status(400).json({
                    error: 'User Update Failed'
                });
            }
            updatedUser.hashedPassword = undefined;
            updatedUser.salt = undefined;
            res.json(updatedUser);
        });
    });
}
