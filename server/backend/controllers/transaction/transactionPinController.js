const Joi = require('joi');
const argon2 = require('argon2');
const crypto = require('crypto');
const { insertTransactionPin, getTransactionPinHashByUserId, getRecoveryTokenHashByUserId, updateTransactionPin } = require('../../models/transaction/transactionPinModel');

exports.createTransactionPin = async (req, res) => {
    try {
        const pinSchema = Joi.object({
            pin: Joi.string()
                .length(4)
                .pattern(/^[0-9]+$/)
                .required()
                .messages({
                    'string.length': 'PIN must be exactly 4 digits.',
                    'string.pattern.base': 'PIN must only contain numeric characters.',
                    'any.required': 'PIN is required.',
                }),
        });

        const { error, value } = pinSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: 'Validation failed',
                details: error.details[0].message,
            });
        }

        const { pin } = value;
        const userId = req.user.id;


        const pinHash = await argon2.hash(pin, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 1,
        });


        const recoveryToken = crypto.randomBytes(32).toString("hex");


        const recoveryTokenHash = await argon2.hash(recoveryToken, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 1,
        });


        await insertTransactionPin({
            userId,
            pinHash,
            recoveryTokenHash,
        });

        res.status(201).json({
            message: 'Transaction PIN created successfully. Please store your recovery token in a secure place, you will need it to reset your PIN.',
            recovery_token: recoveryToken,
        });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.validateTransactionPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const userId = req.user.id;

        const pinHash = await getTransactionPinHashByUserId(userId);

        if (!pinHash) {
            return res.status(401).json({ message: 'Invalid PIN' });
        }

        const isValid = await argon2.verify(pinHash, pin);

        if (!isValid) {
            return res.status(401).json({ message: 'Incorrect PIN' });
        }

        res.status(200).json({ message: 'PIN is valid.' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetTransactionPin = async (req, res) => {
    try {
        const schema = Joi.object({
            newPin: Joi.string()
                .length(4)
                .pattern(/^[0-9]+$/)
                .required()
                .messages({
                    'string.length': 'PIN must be exactly 4 digits.',
                    'string.pattern.base': 'PIN must only contain numeric characters.',
                    'any.required': 'PIN is required.',
                }),
            recoveryToken: Joi.string()
                .required()
                .messages({ 'any.required': 'Recovery token is required.' }),
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: 'Validation failed', details: error.details[0].message });
        }

        const { newPin, recoveryToken } = value;
        const userId = req.user.id;

        const recoveryTokenHash = await getRecoveryTokenHashByUserId(userId);
        if (!recoveryTokenHash) {
            return res.status(401).json({ message: 'No recovery token found for this user.' });
        }

        const isTokenValid = await argon2.verify(recoveryTokenHash, recoveryToken);
        if (!isTokenValid) {
            return res.status(401).json({ message: 'Invalid recovery token.' });
        }

        const newPinHash = await argon2.hash(newPin, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 1,
        });

        const newRecoveryToken = crypto.randomBytes(32).toString('hex');
        const newRecoveryTokenHash = await argon2.hash(newRecoveryToken, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 1,
        });

        await updateTransactionPin({
            userId,
            newPinHash,
            newRecoveryTokenHash,
        });

        res.status(200).json({
            message: 'Transaction PIN has been reset successfully.',
            recovery_token: newRecoveryToken,
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};