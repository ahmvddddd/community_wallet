const axios = require('axios');
const Joi = require('joi');

exports.createStaticVirtualAccount = async (req, res) => {
 
  const schema = Joi.object({
    email: Joi.string().email().required(),
    firstname: Joi.string().required(),
    lastname: Joi.string().required(),
    phonenumber: Joi.string().optional(),
    narration: Joi.string().optional(),
    bvn: Joi.string().pattern(/^\d{11}$/).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: `Validation error: ${error.details[0].message}`,
    });
  }

  try {
    const { email, firstname, lastname, phonenumber, narration, bvn } = value;

    const tx_ref = `VA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const payload = {
      email,
      firstname,
      lastname,
      phonenumber,
      narration,
      bvn,
      is_permanent: true,
      tx_ref,
    };

    
    const response = await axios.post(
      `${process.env.FLW_BASE_URL}/v3/virtual-account-numbers`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const { data: body } = response;

    if (body.status === 'success') {
      return res.status(201).json({
        status: 'success',
        message: 'Virtual account created successfully',
        data: body.data,
      });
    }

    return res.status(502).json({
      status: 'error',
      message: body.message || 'Failed to create virtual account',
    });
  } catch (err) {

    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred while creating virtual account',
    });
  }
};
