const axios = require("axios");

const VEDANTIC_BASE_URL =
    process.env.VEDANTIC_BASE_URL || "http://localhost:8080";

const VEDANTIC_EMAIL =
    process.env.VEDANTIC_EMAIL;

const VEDANTIC_PASSWORD =
    process.env.VEDANTIC_PASSWORD;


async function loginToVedantic() {

    const response = await axios.post(
        `${VEDANTIC_BASE_URL}/api/v1/auth/login`,
        {
            email: VEDANTIC_EMAIL,
            password: VEDANTIC_PASSWORD
        }
    );

    if (
        !response.data?.success ||
        !response.data?.data?.token
    ) {
        throw new Error(
            "Vedantic login failed: token not received"
        );
    }

    return response.data.data;
}


async function getVedanticTenants() {

    const loginData = await loginToVedantic();

    const token = loginData.token;

    const response = await axios.get(
        `${VEDANTIC_BASE_URL}/api/v1/admin/tenants`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
}

async function syncVedanticTenants(pool) {

    const tenantsResponse =
        await getVedanticTenants();

    const tenants =
        tenantsResponse.data || [];

    for (const tenant of tenants) {

        await pool.query(
            `
            INSERT INTO shops
            (
                name,
                created_at,
                vedantic_tenant_id
            )
            VALUES
            ($1, $2, $3)
            ON CONFLICT (vedantic_tenant_id)
            DO UPDATE SET
                name = EXCLUDED.name
            `,
            [
                tenant.businessName,
                tenant.createdAt
                    ? new Date(tenant.createdAt)
                    : new Date(),
                tenant.id
            ]
        );

    }

    return tenants.length;
}


module.exports = {
    loginToVedantic,
    getVedanticTenants,
    syncVedanticTenants
};