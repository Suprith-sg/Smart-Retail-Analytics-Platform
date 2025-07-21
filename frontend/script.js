// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const errorMessage = document.getElementById('error-message');
    const loadingMessage = document.querySelector('.loading-message');

    // Define the backend API URL
    // IMPORTANT: If your Flask app is running on a different IP or port, update this.
    // For local development, 'http://127.0.0.1:5000' is typical.
    const API_URL = 'http://127.0.0.1:5000/products';

    // Function to fetch products from the backend
    async function fetchProducts() {
        try {
            loadingMessage.classList.remove('hidden'); // Show loading message
            errorMessage.classList.add('hidden'); // Hide any previous error

            const response = await fetch(API_URL);

            if (!response.ok) {
                // If response is not OK (e.g., 404, 500), throw an error
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const products = await response.json();
            displayProducts(products);

        } catch (error) {
            console.error('Error fetching products:', error);
            productsContainer.innerHTML = ''; // Clear loading message
            errorMessage.classList.remove('hidden'); // Show error message
        } finally {
            loadingMessage.classList.add('hidden'); // Hide loading message
        }
    }

    // Function to display products on the page
    function displayProducts(products) {
        productsContainer.innerHTML = ''; // Clear existing content (like loading message)

        if (products.length === 0) {
            productsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full">No products found.</p>';
            return;
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card'); // Apply CSS classes for styling

            productCard.innerHTML = `
                <h2 class="product-name">${product.product_name}</h2>
                <p class="product-category">Category: ${product.category || 'N/A'}</p>
                <p class="product-brand">Brand: ${product.brand || 'N/A'}</p>
                <p class="product-sku">SKU: ${product.sku || 'N/A'}</p>
                <p class="product-price">$${product.unit_price.toFixed(2)}</p>
            `;
            productsContainer.appendChild(productCard);
        });
    }

    // Call the fetch function when the page loads
    fetchProducts();
});
