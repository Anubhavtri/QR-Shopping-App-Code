require("dotenv").config();
const express = require("express");
const cors = require("cors");

const pool = require("./db");

const app = express();

const PORT = 5000;

const axios = require("axios");


app.use(cors());
app.use(express.json());

const {
    loginToVedantic,
    getVedanticTenants,
    syncVedanticTenants
} = require("./vedantic");

app.get("/api/vedantic/test-login", async (req, res) => {

    try {

        const data = await loginToVedantic();

        res.json({
            success: true,
            message: "Vedantic login successful",
            user: data.user
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Vedantic login failed"
        });

    }

});

app.get("/api/vedantic/tenants", async (req, res) => {

    try {

        const tenants =
            await getVedanticTenants();

        res.json(tenants);

    } catch (error) {

        console.error(
            "Vedantic tenants error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to get Vedantic tenants"
        });

    }

});

app.post("/api/vedantic/sync-tenants", async (req, res) => {

    try {

        const count =
            await syncVedanticTenants(pool);

        res.json({
            success: true,
            message: "Tenants synced successfully",
            count: count
        });

    } catch (error) {

        console.error(
            "Tenant sync error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to sync tenants"
        });

    }

});

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371;

    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);


    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;
}


function toRadians(degrees) {

    return degrees *
        (Math.PI / 180);

}

// Health check
app.get("/", (req, res) => {

    res.json({
        message: "QR Shopping API is running"
    });

});


// Get all shops
app.get("/api/shops", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                address,
                latitude,
                longitude
            FROM shops
            ORDER BY name
        `);

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to get shops"
        });

    }

});

app.get("/api/shops/search", async (req, res) => {

    try {

        const search = req.query.q || "";

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                address,
                latitude,
                longitude,
                whatsapp_number
            FROM shops
            WHERE
                name ILIKE $1
                OR address ILIKE $1
            ORDER BY name
            `,
            [`%${search}%`]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to search shops"
        });

    }

});

app.get("/api/shops/nearby", async (req, res) => {

    try {

        const latitude =
            Number(req.query.latitude);

        const longitude =
            Number(req.query.longitude);

        const radius =
            Number(req.query.radius || 5);


        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {

            return res.status(400).json({
                message: "Invalid location"
            });

        }


        const result = await pool.query(
            `
            SELECT
                id,
                name,
                address,
                latitude,
                longitude,
                whatsapp_number
            FROM shops
            WHERE latitude IS NOT NULL
            AND longitude IS NOT NULL
            `
        );


        const shops = result.rows.map(shop => {

            const distance =
                calculateDistance(
                    latitude,
                    longitude,
                    Number(shop.latitude),
                    Number(shop.longitude)
                );


            return {
                ...shop,
                distance: Number(
                    distance.toFixed(2)
                )
            };

        });


        const nearbyShops =
            shops
                .filter(shop =>
                    shop.distance <= radius
                )
                .sort(
                    (a, b) =>
                        a.distance - b.distance
                );


        res.json(nearbyShops);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to find nearby shops"
        });

    }

});

// Get one shop
app.get("/api/shops/:shopId", async (req, res) => {

    try {

        const { shopId } = req.params;

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                address,
                latitude,
                longitude
            FROM shops
            WHERE id = $1
            `,
            [shopId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Shop not found"
            });

        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to get shop"
        });

    }

});


// Get products for a shop
app.get("/api/shops/:shopId/products", async (req, res) => {

    try {

        const { shopId } = req.params;

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                price,
                stock
            FROM products
            WHERE shop_id = $1
            ORDER BY name
            `,
            [shopId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to get products"
        });

    }

});

app.post("/api/orders", async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            shopId,
            customerName,
            customerPhone,
            items
        } = req.body;


        // -------------------------
        // Validation
        // -------------------------

        if (!shopId) {
            return res.status(400).json({
                message: "Shop is required"
            });
        }

        if (!customerName?.trim()) {
            return res.status(400).json({
                message: "Customer name is required"
            });
        }

        if (!customerPhone?.trim()) {
            return res.status(400).json({
                message: "Customer phone is required"
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }


        // -------------------------
        // Get shop
        // -------------------------

        const shopResult = await client.query(
            `
            SELECT
                id,
                name,
                whatsapp_number
            FROM shops
            WHERE id = $1
            `,
            [shopId]
        );


        if (shopResult.rows.length === 0) {

            return res.status(404).json({
                message: "Shop not found"
            });

        }


        const shop = shopResult.rows[0];


        if (!shop.whatsapp_number) {

            return res.status(400).json({
                message: "Shop WhatsApp number is not configured"
            });

        }


        // -------------------------
        // Load real products
        // -------------------------

        const orderProducts = [];

        let total = 0;


        for (const item of items) {

            const productResult = await client.query(
                `
                SELECT
                    id,
                    name,
                    price,
                    stock
                FROM products
                WHERE id = $1
                AND shop_id = $2
                `,
                [
                    item.productId,
                    shopId
                ]
            );


            if (productResult.rows.length === 0) {

                return res.status(400).json({
                    message:
                        `Product ${item.productId} not found`
                });

            }


            const product = productResult.rows[0];

            const quantity = Number(item.quantity);


            if (quantity <= 0) {

                return res.status(400).json({
                    message: "Invalid quantity"
                });

            }


            if (quantity > product.stock) {

                return res.status(400).json({
                    message:
                        `Not enough stock for ${product.name}`
                });

            }


            const itemTotal =
                Number(product.price) * quantity;


            total += itemTotal;


            orderProducts.push({

                productId: product.id,

                name: product.name,

                price: Number(product.price),

                quantity: quantity,

                itemTotal: itemTotal

            });

        }


        // -------------------------
        // Start transaction
        // -------------------------

        await client.query("BEGIN");


        // -------------------------
        // Insert order
        // -------------------------

        const orderResult = await client.query(
            `
            INSERT INTO orders
            (
                shop_id,
                customer_name,
                customer_phone,
                status,
                total
            )
            VALUES
            ($1, $2, $3, $4, $5)

            RETURNING id, created_at
            `,
            [
                shopId,
                customerName.trim(),
                customerPhone.trim(),
                "PENDING",
                total
            ]
        );


        const order =
            orderResult.rows[0];


        // -------------------------
        // Insert order items
        // -------------------------

        for (const item of orderProducts) {

            await client.query(
                `
                INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    product_name,
                    price,
                    quantity
                )
                VALUES
                ($1, $2, $3, $4, $5)
                `,
                [
                    order.id,
                    item.productId,
                    item.name,
                    item.price,
                    item.quantity
                ]
            );

        }


        // -------------------------
        // Commit
        // -------------------------

        await client.query("COMMIT");


        // -------------------------
        // WhatsApp message
        // -------------------------

        let whatsappMessage =

            `🛒 NEW ORDER

Order #${order.id}

🏪 ${shop.name}

Customer:
${customerName}

Phone:
${customerPhone}

Items:
`;


        for (const item of orderProducts) {

            whatsappMessage +=
                `\n${item.quantity} x ${item.name}
₹${item.itemTotal}`;

        }


        whatsappMessage +=

            `

--------------------
Total: ₹${total}

Order #${order.id}`;


        // WhatsApp URL

        const whatsappUrl =
            `https://wa.me/${shop.whatsapp_number}?text=${encodeURIComponent(
                whatsappMessage
            )}`;


        // -------------------------
        // Response
        // -------------------------

        res.status(201).json({

            message:
                "Order placed successfully",

            orderId:
                order.id,

            total:
                total,

            whatsappUrl:
                whatsappUrl

        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Order creation error:",
            error
        );


        res.status(500).json({

            message:
                "Failed to place order"

        });


    } finally {

        client.release();

    }

});


app.listen(PORT, () => {

    console.log(
        `Backend running at http://localhost:${PORT}`
    );

});