const axios = require("axios");
const Joi = require("joi");
const pool = require("../../db/db");
const {
  insertAccountForGroup,
  insertAccountMetadata,
} = require("../../models/account/accountModel");

exports.createStaticVirtualAccount = async (req, res) => {

  const schema = Joi.object({
    email: Joi.string().email().required(),
    firstname: Joi.string().required(),
    lastname: Joi.string().required(),
    phonenumber: Joi.string().pattern(/^[0-9+]{7,15}$/).optional(),
    narration: Joi.string().max(200).optional(),
    bvn: Joi.string().pattern(/^\d{11}$/).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details[0].message,
    });
  }


  const groupId = req.params.group_id;
  if (!groupId) {
    return res.status(400).json({
      status: "error",
      message: "group_id is required",
    });
  }

  const client = await pool.connect();
  let tx_ref = null;
  let raw = null;

  try {

    const groupRes = await client.query(
      `SELECT created_by FROM "group" WHERE id = $1`,
      [groupId]
    );

    if (groupRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Group not found",
      });
    }

    const groupCreator = String(groupRes.rows[0].created_by);
    const requestUserId = String(req.user.id);

    if (groupCreator !== requestUserId) {
      return res.status(403).json({
        status: "error",
        message: "Only the group creator can generate a virtual account",
      });
    }


    await client.query("BEGIN");

    const { email, firstname, lastname, phonenumber, narration, bvn } = value;

    tx_ref = `VA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

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


    let fwRes;
    try {
      fwRes = await axios.post(
        `${process.env.FLW_BASE_URL}/v3/virtual-account-numbers`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          },
        }
      );
    } catch (apiErr) {
      throw new Error(
        apiErr.response?.data?.message ||
        apiErr.response?.data?.status ||
        apiErr.message ||
        "Flutterwave API request failed"
      );
    }

    raw = fwRes.data;

    if (raw.status !== "success" || !raw.data) {
      throw new Error(raw.message || "Invalid Flutterwave response");
    }

    const data = raw.data;
    const providerRef = data.order_ref || data.id;

    if (!providerRef) {
      throw new Error("Missing provider reference in Flutterwave response");
    }


    const account = await insertAccountForGroup(client, {
      groupId,
      provider: "flutterwave",
      accountNumber: data.account_number,
      bankName: data.bank_name || "Wema Bank",
      providerRef,
    });

    await insertAccountMetadata(client, {
      accountId: account.id,
      provider: "flutterwave",
      rawPayload: raw,
    });


    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      message: "Virtual account created successfully",
      data: { account },
    });
  } catch (err) {
    console.error("VA creation error:", err);


    try {
      const recoveryClient = await pool.connect();

      await recoveryClient.query(
        `INSERT INTO va_recovery (tx_ref, group_id, raw_payload, error_message)
   VALUES ($1, $2, $3, $4)`,
        [
          tx_ref ?? null,
          groupId ?? null,
          JSON.stringify(raw ?? null),
          err?.message ?? "Unknown error",
        ]
      );

      recoveryClient.release();

    } catch (recoveryErr) {
      console.error("Failed to save VA recovery record:", recoveryErr);
    }


    await client.query("ROLLBACK");

    return res.status(500).json({
      status: "error",
      message: err.message || "Internal server error",
    });
  } finally {
    client.release();
  }
};
