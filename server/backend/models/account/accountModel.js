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
            accountNumber,
            providerRef,
            bankName,
        ];

        const { rows } = await client.query(query, values);

        if (!rows.length) {
            throw new Error("Failed to insert account record");
        }

        return rows[0];

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
        const query = `
      INSERT INTO account_metadata (
        account_id,
        provider,
        raw_payload
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const values = [accountId, provider, rawPayload];

        const { rows } = await client.query(query, values);

        if (!rows.length) {
            throw new Error("Failed to insert account metadata");
        }

        return rows[0];

    } catch (err) {
        console.error("insertAccountMetadata error:", err.message);
        throw err;
    }
};
