import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);

    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        loadShops();
    }, []);

    // --------------------------------
    // Load all shops
    // --------------------------------
    const loadShops = async () => {
        try {
            const response = await fetch(`${API_URL}/shops`);

            if (!response.ok) {
                throw new Error("Failed to load shops");
            }

            const data = await response.json();

            setShops(data);

        } catch (error) {
            console.error(error);
            setError("Unable to load shops");

        } finally {
            setLoading(false);
        }
    };

    // --------------------------------
    // View products
    // --------------------------------
    const viewProducts = async (shop) => {
        try {
            setProductsLoading(true);
            setSelectedShop(shop);
            setProducts([]);
            setCart([]);

            const response = await fetch(
                `${API_URL}/shops/${shop.id}/products`
            );

            if (!response.ok) {
                throw new Error("Failed to load products");
            }

            const data = await response.json();

            setProducts(data);

        } catch (error) {
            console.error(error);
            alert("Unable to load products");

        } finally {
            setProductsLoading(false);
        }
    };

    // --------------------------------
    // Back to shops
    // --------------------------------
    const backToShops = () => {
        setSelectedShop(null);
        setProducts([]);
        setCart([]);
    };

const searchShops = async (text) => {
    try {
        const searchText = text.trim();

        // Empty search → load all shops
        if (!searchText) {
            await loadShops();
            return;
        }

        // Less than 3 characters → show all shops
        if (searchText.length < 3) {
            await loadShops();
            return;
        }

        const response = await fetch(
            `${API_URL}/shops/search?q=${encodeURIComponent(searchText)}`
        );

        if (!response.ok) {
            throw new Error("Search failed");
        }

        const data = await response.json();

        console.log("Search results:", data);

        setShops(data);

    } catch (error) {
        console.error(error);
        alert("Unable to search shops");
    }
};

    const findNearbyShops = () => {

        if (!navigator.geolocation) {

            alert(
                "Location is not supported by your browser."
            );

            return;
        }


        navigator.geolocation.getCurrentPosition(

            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                try {

                    const response = await fetch(
                        `${API_URL}/shops/nearby` +
                        `?latitude=${latitude}` +
                        `&longitude=${longitude}` +
                        `&radius=5`
                    );


                    if (!response.ok) {
                        throw new Error(
                            "Unable to find nearby shops"
                        );
                    }


                    const data =
                        await response.json();


                    setShops(data);


                    if (data.length === 0) {

                        alert(
                            "No shops found within 5 km."
                        );

                    }


                } catch (error) {

                    console.error(error);

                    alert(
                        "Unable to find nearby shops"
                    );

                }

            },

            (error) => {

                console.error(error);

                alert(
                    "Please allow location access."
                );

            }

        );

    };

    // --------------------------------
    // Add product to cart
    // --------------------------------
    const addToCart = (product) => {

        setCart((currentCart) => {

            const existingItem = currentCart.find(
                item => item.id === product.id
            );

            // Product already in cart
            if (existingItem) {

                return currentCart.map(item =>
                    item.id === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1
                        }
                        : item
                );
            }

            // New product
            return [
                ...currentCart,
                {
                    ...product,
                    quantity: 1
                }
            ];
        });
    };

    // --------------------------------
    // Increase quantity
    // --------------------------------
    const increaseQuantity = (productId) => {

        setCart(currentCart =>
            currentCart.map(item =>
                item.id === productId
                    ? {
                        ...item,
                        quantity: item.quantity + 1
                    }
                    : item
            )
        );
    };

    // --------------------------------
    // Decrease quantity
    // --------------------------------
    const decreaseQuantity = (productId) => {

        setCart(currentCart =>
            currentCart
                .map(item =>
                    item.id === productId
                        ? {
                            ...item,
                            quantity: item.quantity - 1
                        }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    };

    // --------------------------------
    // Calculate cart total
    // --------------------------------
    const cartTotal = cart.reduce(
        (total, item) =>
            total + Number(item.price) * item.quantity,
        0
    );

    // --------------------------------
    // Place order
    // --------------------------------
    const placeOrder = async () => {

        if (cart.length === 0) {

            alert("Your cart is empty.");

            return;

        }


        if (!customerName.trim()) {

            alert("Please enter your name.");

            return;

        }


        if (!customerPhone.trim()) {

            alert("Please enter your phone number.");

            return;

        }


        const order = {

            shopId:
                selectedShop.id,

            customerName:
                customerName,

            customerPhone:
                customerPhone,

            items: cart.map(item => ({

                productId:
                    item.id,

                quantity:
                    item.quantity

            }))

        };


        try {

            const response = await fetch(

                `${API_URL}/orders`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(order)

                }

            );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Order failed"
                );

            }


            console.log(
                "Order created:",
                result.orderId
            );


            // Clear cart

            setCart([]);

            setCustomerName("");

            setCustomerPhone("");


            // Open WhatsApp
            window.location.href =
                result.whatsappUrl;


        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Unable to place order"
            );

        }


    };

    // --------------------------------
    // Loading
    // --------------------------------
    if (loading) {
        return (
            <div className="container">
                <h2>Loading shops...</h2>
            </div>
        );
    }

    // --------------------------------
    // Error
    // --------------------------------
  if (error) {
    return (
        <div className="container error-container">
            <h2>{error}</h2>
        </div>
    );
}

return (
    <div className="app">

        {/* ========================= */}
        {/* HEADER / HERO */}
        {/* ========================= */}

        {!selectedShop && (
            <>

                <header className="hero">

                    <div className="hero-content">

                        <h1>
                            🛒 Local Shopping
                        </h1>

                        <p className="hero-subtitle">
                            Shop local. Find nearby stores. Order easily.
                        </p>

                        <p className="hero-description">
                            Discover products from local shops around you
                            and place your order in just a few clicks.
                        </p>


                        {/* SEARCH */}

                        <div className="search-container">

                            <div className="search-box">

                                <span className="search-icon">
                                    🔍
                                </span>

                                <input
                                    type="text"
                                    placeholder="Search shops..."
                                    value={searchText}
                                    onChange={(e) => {

                                        const value = e.target.value;

                                        setSearchText(value);

                                        searchShops(value);

                                    }}
                                />

                            </div>


                            <button
                                className="near-me-button"
                                onClick={findNearbyShops}
                            >
                                📍 Near Me
                            </button>

                        </div>

                    </div>

                </header>


                {/* ========================= */}
                {/* SHOPS */}
                {/* ========================= */}

                <section className="shops-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Explore Local Shops
                            </h2>

                            <p>
                                Find a shop and start shopping
                            </p>

                        </div>

                    </div>


                    <div className="shops">

                        {loading ? (

                            <div className="loading">
                                <p>Loading shops...</p>
                            </div>

                        ) : shops.length === 0 ? (

                            <div className="no-shops">

                                <div className="no-shops-icon">
                                    🔍
                                </div>

                                <h3>
                                    No shops found
                                </h3>

                                <p>
                                    Try searching for another shop.
                                </p>

                            </div>

                        ) : (

                            shops.map(shop => (

                                <div
                                    className="shop-card"
                                    key={shop.id}
                                >

                                    <div className="shop-icon">
                                        🏪
                                    </div>


                                    <div className="shop-content">

                                        <h3>
                                            {shop.name}
                                        </h3>

                                        <p className="shop-address">
                                            📍 {shop.address}
                                        </p>


                                        {shop.distance !== undefined && (
                                            <p className="shop-distance">
                                                📍 {shop.distance} km away
                                            </p>
                                        )}


                                        <button
                                            className="shop-button"
                                            onClick={() =>
                                                viewProducts(shop)
                                            }
                                        >
                                            View Products →
                                        </button>

                                    </div>

                                </div>

                            ))

                        )}

                    </div>

                </section>


                {/* ========================= */}
                {/* HOW IT WORKS */}
                {/* ========================= */}

                <section className="how-it-works">

                    <h2>
                        How It Works
                    </h2>

                    <p className="section-description">
                        Shopping from local stores made simple
                    </p>


                    <div className="steps">

                        <div className="step">

                            <div className="step-icon">
                                📍
                            </div>

                            <h3>
                                Find a Shop
                            </h3>

                            <p>
                                Search for a local shop or find
                                stores near your location.
                            </p>

                        </div>


                        <div className="step">

                            <div className="step-icon">
                                🛍️
                            </div>

                            <h3>
                                Choose Products
                            </h3>

                            <p>
                                Browse products available at
                                your selected shop.
                            </p>

                        </div>


                        <div className="step">

                            <div className="step-icon">
                                🛒
                            </div>

                            <h3>
                                Place Your Order
                            </h3>

                            <p>
                                Add products to your cart and
                                enter your details.
                            </p>

                        </div>


                        <div className="step">

                            <div className="step-icon">
                                💬
                            </div>

                            <h3>
                                Shop Gets Your Order
                            </h3>

                            <p>
                                Your order details are sent
                                directly to the shop.
                            </p>

                        </div>

                    </div>

                </section>


                {/* ========================= */}
                {/* FOOTER */}
                {/* ========================= */}

                <footer className="footer">

                    <h3>
                        🛒 Local Shopping
                    </h3>

                    <p>
                        Shop local. Support local.
                    </p>

                </footer>

            </>
        )}


        {/* ========================= */}
        {/* PRODUCTS */}
        {/* ========================= */}

        {selectedShop && (

            <section className="products-section">

                <div className="products-header">

                    <button
                        className="back-button"
                        onClick={backToShops}
                    >
                        ← Back to Shops
                    </button>


                    <div className="selected-shop">

                        <div className="shop-icon">
                            🏪
                        </div>

                        <div>

                            <h2>
                                {selectedShop.name}
                            </h2>

                            <p>
                                📍 {selectedShop.address}
                            </p>

                        </div>

                    </div>

                </div>


                <h2 className="products-title">
                    Products
                </h2>


                {productsLoading && (
                    <div className="loading">
                        <p>Loading products...</p>
                    </div>
                )}


                {!productsLoading &&
                    products.length === 0 && (

                        <div className="no-shops">

                            <div className="no-shops-icon">
                                🛍️
                            </div>

                            <h3>
                                No products available
                            </h3>

                            <p>
                                This shop currently has no products.
                            </p>

                        </div>

                    )
                }


                <div className="products">

                    {products.map(product => (

                        <div
                            className="product-card"
                            key={product.id}
                        >

                            <div className="product-icon">
                                🛍️
                            </div>


                            <div className="product-info">

                                <h3>
                                    {product.name}
                                </h3>

                                <p className="product-price">
                                    ₹{product.price}
                                </p>

                                <p className="product-stock">
                                    {product.stock > 0
                                        ? `${product.stock} available`
                                        : "Out of stock"
                                    }
                                </p>

                            </div>


                            <button
                                className="add-button"
                                onClick={() =>
                                    addToCart(product)
                                }
                                disabled={product.stock <= 0}
                            >
                                {product.stock > 0
                                    ? "Add to Cart"
                                    : "Out of Stock"
                                }
                            </button>

                        </div>

                    ))}

                </div>

            </section>

        )}


        {/* ========================= */}
        {/* CART */}
        {/* ========================= */}

        {selectedShop && cart.length > 0 && (

            <section className="cart">

                <div className="cart-header">

                    <h2>
                        🛒 Your Cart
                    </h2>

                    <p>
                        {selectedShop.name}
                    </p>

                </div>


                {cart.map(item => (

                    <div
                        className="cart-item"
                        key={item.id}
                    >

                        <div className="cart-product">

                            <strong>
                                {item.name}
                            </strong>

                            <span>
                                ₹{item.price}
                            </span>

                        </div>


                        <div className="quantity">

                            <button
                                onClick={() =>
                                    decreaseQuantity(item.id)
                                }
                            >
                                −
                            </button>


                            <span>
                                {item.quantity}
                            </span>


                            <button
                                onClick={() =>
                                    increaseQuantity(item.id)
                                }
                            >
                                +
                            </button>

                        </div>


                        <strong className="item-total">
                            ₹{
                                Number(item.price) *
                                item.quantity
                            }
                        </strong>

                    </div>

                ))}


                <div className="cart-total">

                    <span>
                        Total
                    </span>

                    <strong>
                        ₹{cartTotal}
                    </strong>

                </div>


                <div className="customer-details">

                    <h3>
                        Customer Details
                    </h3>


                    <input
                        type="text"
                        placeholder="Your name"
                        value={customerName}
                        onChange={(e) =>
                            setCustomerName(e.target.value)
                        }
                    />


                    <input
                        type="tel"
                        placeholder="Phone number"
                        value={customerPhone}
                        onChange={(e) =>
                            setCustomerPhone(e.target.value)
                        }
                    />

                </div>


                <button
                    className="order-button"
                    onClick={placeOrder}
                >
                    Place Order →
                </button>

            </section>

        )}

    </div>
);
}

export default App;