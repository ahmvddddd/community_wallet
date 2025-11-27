const { encryptFields, decryptFields } = require('../../utils/secureFields');
const { ACCOUNT_SECURE_FIELDS, ACCOUNT_METADATA_SECURE_FIELDS } = require('../../utils/secureFieldMaps');

exports.insertAccountForGroup = async (
    client,
    {
        groupId,
        provider,
        accountNumber,
        providerRef,
        bankName,
    }
) => {

    const accountData = {
       virtual_account_number: accountNumber,
       provider_ref: providerRef 
    };

    const secureAccount = encryptFields(accountData, ACCOUNT_SECURE_FIELDS);

    try {
        const query = `
      INSERT INTO account (
        group_id,
        provider,
        virtual_account_number,
        provider_ref,
        bank_name,
        created_at,
        status
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), 'active')
      RETURNING *
    `;

        const values = [
            groupId,
            provider,
            secureAccount.virtual_account_number,
            secureAccount.provider_ref,
            bankName,
        ];

        const { rows } = await client.query(query, values);

        if (!rows.length) {
            throw new Error("Failed to insert account record");
        }

        const row = rows[0];
        return decryptFields(row, ACCOUNT_SECURE_FIELDS);

    } catch (err) {
        console.error("insertAccountForGroup error:", err.message);
        throw err;
    }
};


exports.insertAccountMetadata = async (
    client,
    {
        accountId,
        provider,
        rawPayload,
    }
) => {

    try {

        const accountMetaData ={
            raw_payload: rawPayload,
        };

        const secureMetadata = encryptFields(accountMetaData, ACCOUNT_METADATA_SECURE_FIELDS);
        const query = `
      INSERT INTO account_metadata (
        account_id,
        provider,
        raw_payload
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const values = [accountId, provider, 
            JSON.stringify({ encrypted: secureMetadata.raw_payload })
        ];

        const { rows } = await client.query(query, values);

        if (!rows.length) {
            throw new Error("Failed to insert account metadata");
        }

        const row = rows[0];
        return decryptFields(row, ACCOUNT_METADATA_SECURE_FIELDS);

    } catch (err) {
        console.error("insertAccountMetadata error:", err.message);
        throw err;
    }
};
