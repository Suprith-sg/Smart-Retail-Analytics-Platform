// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const salesContainer = document.getElementById('sales-container');
    const analyticsSummaryContainer = document.getElementById('analytics-summary-container');
    const topProductsContainer = document.getElementById('top-products-container');
    const salesForecastContainer = document.getElementById('sales-forecast-container');
    const inventoryRecommendationsContainer = document.getElementById('inventory-recommendations-container'); // New container
    const errorMessage = document.getElementById('error-message');

    const productsTab = document.getElementById('products-tab');
    const salesTab = document.getElementById('sales-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const productsSection = document.getElementById('products-section');
    const salesSection = document.getElementById('sales-section');
    const analyticsSection = document.getElementById('analytics-section');

    const API_BASE_URL = 'http://127.0.0.1:5000'; // Base URL for your backend API

    // --- Tab Switching Logic ---
    function showSection(sectionToShow, tabToActivate) {
        // Hide all sections
        productsSection.classList.add('hidden');
        salesSection.classList.add('hidden');
        analyticsSection.classList.add('hidden');

        // Deactivate all tabs
        productsTab.classList.remove('border-blue-500', 'text-blue-600');
        salesTab.classList.remove('border-blue-500', 'text-blue-600');
        analyticsTab.classList.remove('border-blue-500', 'text-blue-600');
        productsTab.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
        salesTab.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
        analyticsTab.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');


        // Show the selected section
        sectionToShow.classList.remove('hidden');
        // Activate the selected tab
        tabToActivate.classList.add('border-blue-500', 'text-blue-600');
        tabToActivate.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');


        // Based on the tab, fetch data
        if (tabToActivate === productsTab) {
            fetchProducts();
        } else if (tabToActivate === salesTab) {
            fetchSales();
        } else if (tabToActivate === analyticsTab) {
            fetchAnalyticsSummary();
            fetchSalesForecast();
            fetchInventoryRecommendations(); // Fetch inventory recommendations for the new tab
        }
    }

    // Event Listeners for Tabs
    productsTab.addEventListener('click', () => showSection(productsSection, productsTab));
    salesTab.addEventListener('click', () => showSection(salesSection, salesTab));
    analyticsTab.addEventListener('click', () => showSection(analyticsSection, analyticsTab));

    // --- Fetching Products Data ---
    async function fetchProducts() {
        productsContainer.innerHTML = '<div class="loading-message text-center text-gray-600 col-span-full">Loading products...</div>';
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const products = await response.json();
            console.log('Fetched products data:', products);
            displayProducts(products);
        } catch (error) {
            console.error('Error fetching or processing products:', error);
            productsContainer.innerHTML = '';
            errorMessage.classList.remove('hidden');
        }
    }

    // --- Displaying Products ---
    function displayProducts(products) {
        productsContainer.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            productsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full">No products found. Your database might be empty or the query returned no results.</p>';
            return;
        }

        products.forEach(product => {
            const unitPrice = parseFloat(product.unit_price);
            const productCard = document.createElement('div');
            productCard.classList.add('product-card', 'bg-white', 'p-6', 'rounded-lg', 'shadow-lg', 'flex', 'flex-col', 'justify-between', 'transition-transform', 'duration-200', 'ease-in-out');

            productCard.innerHTML = `
                <h2 class="text-xl font-semibold text-gray-800 mb-2">${product.product_name || 'N/A'}</h2>
                <p class="text-sm text-gray-600 mb-1">Category: ${product.category || 'N/A'}</p>
                <p class="text-sm text-gray-600 mb-1">Brand: ${product.brand || 'N/A'}</p>
                <p class="text-sm text-gray-600 mb-4">SKU: ${product.sku || 'N/A'}</p>
                <p class="text-2xl font-bold text-green-500">$${isNaN(unitPrice) ? 'N/A' : unitPrice.toFixed(2)}</p>
            `;
            productsContainer.appendChild(productCard);
        });
    }

    // --- Fetching Sales Data ---
    async function fetchSales() {
        salesContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading sales data...</div>';
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/sales`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const sales = await response.json();
            console.log('Fetched sales data:', sales);
            displaySales(sales);
        } catch (error) {
            console.error('Error fetching or processing sales:', error);
            salesContainer.innerHTML = '';
            errorMessage.classList.remove('hidden');
        }
    }

    // --- Displaying Sales ---
    function displaySales(sales) {
        salesContainer.innerHTML = ''; // Clear previous content

        if (!Array.isArray(sales) || sales.length === 0) {
            salesContainer.innerHTML = '<p class="text-center text-gray-600">No sales transactions found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('min-w-full', 'bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow-md');

        table.innerHTML = `
            <thead class="bg-gray-200">
                <tr>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">Transaction ID</th>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                    <th class="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tr-lg">Total Amount</th>
                </tr>
            </thead>
            <tbody id="sales-table-body">
            </tbody>
        `;
        salesContainer.appendChild(table);

        const tbody = document.getElementById('sales-table-body');

        sales.forEach(sale => {
            const row = document.createElement('tr');
            row.classList.add('border-b', 'border-gray-200', 'hover:bg-gray-50');

            // Format transaction date
            const date = new Date(sale.transaction_date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Format items
            const itemsList = sale.items.map(item => `
                <span class="block text-gray-700 font-medium">${item.product_name}</span>
                <span class="block text-gray-500 text-xs">Qty: ${item.quantity} @ $${item.unit_price_at_sale.toFixed(2)}</span>
            `).join('');

            row.innerHTML = `
                <td class="py-3 px-4 text-sm text-gray-800">${sale.transaction_id}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${formattedDate}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${sale.customer_name || 'N/A'}</td>
                <td class="py-3 px-4 text-sm">${itemsList}</td>
                <td class="py-3 px-4 text-sm text-gray-800">${sale.payment_method || 'N/A'}</td>
                <td class="py-3 px-4 text-sm text-gray-800 font-semibold text-green-600">$${sale.total_amount.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // --- Fetching Analytics Summary Data ---
    async function fetchAnalyticsSummary() {
        analyticsSummaryContainer.innerHTML = '<div class="loading-message text-center text-gray-600 col-span-full">Loading analytics summary...</div>';
        topProductsContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading top products...</div>';
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/analytics/summary`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const summaryData = await response.json();
            console.log('Fetched analytics summary data:', summaryData);
            displayAnalyticsSummary(summaryData);
        } catch (error) {
            console.error('Error fetching or processing analytics summary:', error);
            analyticsSummaryContainer.innerHTML = '';
            topProductsContainer.innerHTML = '';
            errorMessage.classList.remove('hidden');
        }
    }

    // --- Displaying Analytics Summary ---
    function displayAnalyticsSummary(summary) {
        analyticsSummaryContainer.innerHTML = ''; // Clear previous content

        const summaryCards = [
            { title: 'Total Revenue', value: `$${summary.total_revenue.toFixed(2)}`, icon: '💰' },
            { title: 'Total Products Sold', value: summary.total_products_sold.toLocaleString(), icon: '📦' },
            { title: 'Total Transactions', value: summary.total_transactions.toLocaleString(), icon: '🛒' },
            { title: 'Unique Customers', value: summary.unique_customers.toLocaleString(), icon: '👥' }
        ];

        summaryCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('bg-white', 'p-6', 'rounded-lg', 'shadow-md', 'text-center');
            cardElement.innerHTML = `
                <div class="text-4xl mb-2">${card.icon}</div>
                <h3 class="text-lg font-semibold text-gray-700">${card.title}</h3>
                <p class="text-3xl font-bold text-blue-600 mt-2">${card.value}</p>
            `;
            analyticsSummaryContainer.appendChild(cardElement);
        });

        // Display Top Selling Products
        topProductsContainer.innerHTML = ''; // Clear previous content
        if (summary.top_selling_products && summary.top_selling_products.length > 0) {
            const topProductsList = document.createElement('ul');
            topProductsList.classList.add('list-disc', 'list-inside', 'text-gray-700', 'space-y-2');
            summary.top_selling_products.forEach(product => {
                const listItem = document.createElement('li');
                listItem.classList.add('bg-white', 'p-3', 'rounded-md', 'shadow-sm', 'flex', 'justify-between', 'items-center');
                listItem.innerHTML = `
                    <span class="font-medium">${product.product_name}</span>
                    <span class="text-blue-500 font-bold">${product.total_quantity_sold.toLocaleString()} units</span>
                `;
                topProductsList.appendChild(listItem);
            });
            topProductsContainer.appendChild(topProductsList);
        } else {
            topProductsContainer.innerHTML = '<p class="text-center text-gray-600">No top selling products data available.</p>';
        }
    }

    // --- Fetching Sales Forecast Data ---
    async function fetchSalesForecast() {
        salesForecastContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading sales forecast...</div>';
        errorMessage.classList.add('hidden');

        try {
            // Fetch forecast for next 7 days (can be made configurable)
            const response = await fetch(`${API_BASE_URL}/analytics/forecast?days=7`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const forecastData = await response.json();
            console.log('Fetched sales forecast data:', forecastData);
            displaySalesForecast(forecastData);
        } catch (error) {
            console.error('Error fetching or processing sales forecast:', error);
            salesForecastContainer.innerHTML = '';
            errorMessage.classList.remove('hidden');
        }
    }

    // --- Displaying Sales Forecast ---
    function displaySalesForecast(forecast) {
        salesForecastContainer.innerHTML = ''; // Clear previous content

        if (!Array.isArray(forecast) || forecast.length === 0) {
            salesForecastContainer.innerHTML = '<p class="text-center text-gray-600">No sales forecast data available.</p>';
            return;
        }

        const forecastSectionHeader = document.createElement('h2');
        forecastSectionHeader.classList.add('text-2xl', 'font-bold', 'text-gray-800', 'mb-4', 'mt-8');
        forecastSectionHeader.textContent = 'Sales Forecast (Next 7 Days)';
        salesForecastContainer.appendChild(forecastSectionHeader);

        const forecastList = document.createElement('div');
        forecastList.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-4'); // Grid for forecast items

        forecast.forEach(item => {
            const forecastCard = document.createElement('div');
            forecastCard.classList.add('bg-white', 'p-4', 'rounded-lg', 'shadow-sm', 'border', 'border-blue-200');

            const date = new Date(item.date);
            const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            forecastCard.innerHTML = `
                <p class="text-sm text-gray-600">${formattedDate}</p>
                <p class="text-xl font-bold text-blue-700">$${item.predicted_revenue.toFixed(2)}</p>
            `;
            forecastList.appendChild(forecastCard);
        });
        salesForecastContainer.appendChild(forecastList);
    }

    // --- Fetching Inventory Recommendations Data ---
    async function fetchInventoryRecommendations() {
        inventoryRecommendationsContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading inventory recommendations...</div>';
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/analytics/inventory_recommendations`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const recommendationsData = await response.json();
            console.log('Fetched inventory recommendations data:', recommendationsData);
            displayInventoryRecommendations(recommendationsData);
        } catch (error) {
            console.error('Error fetching or processing inventory recommendations:', error);
            inventoryRecommendationsContainer.innerHTML = '';
            errorMessage.classList.remove('hidden');
        }
    }

    // --- Displaying Inventory Recommendations ---
    function displayInventoryRecommendations(recommendations) {
        inventoryRecommendationsContainer.innerHTML = ''; // Clear previous content

        if (!Array.isArray(recommendations) || recommendations.length === 0) {
            inventoryRecommendationsContainer.innerHTML = '<p class="text-center text-gray-600">No inventory reorder recommendations at this time.</p>';
            return;
        }

        const recommendationsList = document.createElement('ul');
        recommendationsList.classList.add('list-disc', 'list-inside', 'text-gray-700', 'space-y-2');

        recommendations.forEach(item => {
            const listItem = document.createElement('li');
            listItem.classList.add('bg-white', 'p-3', 'rounded-md', 'shadow-sm', 'flex', 'flex-col', 'md:flex-row', 'justify-between', 'items-start', 'md:items-center');
            listItem.innerHTML = `
                <div>
                    <span class="font-medium text-lg text-gray-800">${item.product_name}</span>
                    <span class="block text-sm text-gray-600">Current Stock: ${item.current_stock} | Reorder Level: ${item.reorder_level}</span>
                </div>
                <div class="mt-2 md:mt-0 text-right">
                    <span class="block text-green-600 font-bold text-md">Reorder: ${item.recommended_reorder_quantity} units</span>
                    <span class="block text-gray-500 text-xs">Est. Cost: $${item.estimated_cost.toFixed(2)}</span>
                </div>
            `;
            recommendationsList.appendChild(listItem);
        });
        inventoryRecommendationsContainer.appendChild(recommendationsList);
    }


    // Initial load: Show products section by default
    showSection(productsSection, productsTab);
});
