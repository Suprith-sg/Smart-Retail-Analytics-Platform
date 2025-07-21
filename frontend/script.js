// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const productsContainer = document.getElementById('products-container');
    const salesContainer = document.getElementById('sales-container');
    const analyticsSummaryContainer = document.getElementById('analytics-summary-container');
    const topProductsContainer = document.getElementById('top-products-container');
    const salesForecastContainer = document.getElementById('sales-forecast-container');
    const inventoryRecommendationsContainer = document.getElementById('inventory-recommendations-container');
    const errorMessage = document.getElementById('error-message'); // This is the general error message

    const productsTab = document.getElementById('products-tab');
    const salesTab = document.getElementById('sales-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const productsSection = document.getElementById('products-section');
    const salesSection = document.getElementById('sales-section');
    const analyticsSection = document.getElementById('analytics-section');

    // New interactive elements
    const productSearchInput = document.getElementById('product-search-input');
    const salesStartDateInput = document.getElementById('sales-start-date');
    const salesEndDateInput = document.getElementById('sales-end-date');
    const filterSalesBtn = document.getElementById('filter-sales-btn');
    const forecastDaysInput = document.getElementById('forecast-days-input');
    const generateForecastBtn = document.getElementById('generate-forecast-btn');

    // Chart instances
    let salesForecastChartInstance = null;
    let topProductsChartInstance = null;


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

        // Always hide general error when switching tabs, it will be shown by specific fetch errors if needed
        errorMessage.classList.add('hidden');

        // Based on the tab, fetch data
        if (tabToActivate === productsTab) {
            fetchProducts();
        } else if (tabToActivate === salesTab) {
            fetchSales();
        } else if (tabToActivate === analyticsTab) {
            // For analytics, we'll call all fetches and then decide on the general error
            // We'll use Promise.allSettled to wait for all of them
            Promise.allSettled([
                fetchAnalyticsSummary(),
                fetchSalesForecast(),
                fetchInventoryRecommendations()
            ]).then(results => {
                const anyFailed = results.some(result => result.status === 'rejected');
                if (anyFailed) {
                    errorMessage.classList.remove('hidden');
                } else {
                    errorMessage.classList.add('hidden');
                }
            });
        }
    }

    // --- Event Listeners for Tabs and New Controls ---
    productsTab.addEventListener('click', () => showSection(productsSection, productsTab));
    salesTab.addEventListener('click', () => showSection(salesSection, salesTab));
    analyticsTab.addEventListener('click', () => showSection(analyticsSection, analyticsTab));

    // Product Search Event Listener
    productSearchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter' || productSearchInput.value.length >= 3 || productSearchInput.value.length === 0) {
            fetchProducts();
        }
    });

    // Sales Filter Event Listener
    filterSalesBtn.addEventListener('click', fetchSales);

    // Forecast Generation Event Listener
    generateForecastBtn.addEventListener('click', fetchSalesForecast);


    // --- Fetching Products Data (with search) ---
    async function fetchProducts() {
        productsContainer.innerHTML = '<div class="loading-message text-center text-gray-600 col-span-full">Loading products...</div>';
        // No need to manage general error here, as it's only one fetch per tab
        // errorMessage.classList.add('hidden'); // Already hidden by showSection

        const searchQuery = productSearchInput.value.trim();
        let url = `${API_BASE_URL}/products`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const products = await response.json();
            console.log('Fetched products data:', products);
            displayProducts(products);
        } catch (error) {
            console.error('Error fetching or processing products:', error);
            productsContainer.innerHTML = '';
            errorMessage.classList.remove('hidden'); // Show general error if this specific fetch fails
        }
    }

    // --- Displaying Products ---
    function displayProducts(products) {
        productsContainer.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            productsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full">No products found matching your criteria.</p>';
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

    // --- Fetching Sales Data (with date filter) ---
    async function fetchSales() {
        salesContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading sales data...</div>';
        // errorMessage.classList.add('hidden'); // Already hidden by showSection

        const startDate = salesStartDateInput.value;
        const endDate = salesEndDateInput.value;

        let url = `${API_BASE_URL}/sales`;
        const params = [];
        if (startDate) {
            params.push(`start_date=${startDate}`);
        }
        if (endDate) {
            params.push(`end_date=${endDate}`);
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const sales = await response.json();
            console.log('Fetched sales data:', sales);
            displaySales(sales);
        } catch (error) {
            console.error('Error fetching or processing sales:', error);
            salesContainer.innerHTML = '';
            errorMessage.classList.remove('hidden'); // Show general error if this specific fetch fails
        }
    }

    // --- Displaying Sales ---
    function displaySales(sales) {
        salesContainer.innerHTML = '';

        if (!Array.isArray(sales) || sales.length === 0) {
            salesContainer.innerHTML = '<p class="text-center text-gray-600">No sales transactions found for the selected date range.</p>';
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

            const date = new Date(sale.transaction_date);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

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
        topProductsContainer.innerHTML = '<div class="loading-message text-center text-gray-600 mt-4">Loading top products...</div>'; // Keep loading message for chart
        // No need to manage general error here, as it's handled by Promise.allSettled in showSection
        // errorMessage.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/analytics/summary`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const summaryData = await response.json();
            console.log('Fetched analytics summary data:', summaryData);
            displayAnalyticsSummary(summaryData);
            displayTopSellingProductsChart(summaryData.top_selling_products); // Display chart
            return Promise.resolve(); // Indicate success for Promise.allSettled
        } catch (error) {
            console.error('Error fetching or processing analytics summary:', error);
            analyticsSummaryContainer.innerHTML = '';
            topProductsContainer.innerHTML = '';
            // errorMessage.classList.remove('hidden'); // Handled by Promise.allSettled
            return Promise.reject(error); // Indicate failure for Promise.allSettled
        }
    }

    // --- Displaying Analytics Summary Cards ---
    function displayAnalyticsSummary(summary) {
        analyticsSummaryContainer.innerHTML = '';

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
    }

    // --- Displaying Top Selling Products Chart ---
    function displayTopSellingProductsChart(topProducts) {
        // Ensure the canvas element exists before trying to get its context
        let canvas = document.getElementById('top-products-chart'); // Changed from const to let
        // Re-insert canvas if it was removed by previous innerHTML assignments
        if (!canvas || !topProductsContainer.contains(canvas)) {
             topProductsContainer.innerHTML = `<canvas id="top-products-chart"></canvas><div class="loading-message text-center text-gray-600 mt-4">Loading top products...</div>`;
             canvas = document.getElementById('top-products-chart'); // Reassign canvas after re-insertion
             if (!canvas) {
                console.error('Top products chart canvas element still not found after re-insertion!');
                topProductsContainer.innerHTML = '<p class="text-center text-red-500 mt-4">Chart display error: Canvas element missing.</p>';
                return;
            }
        }

        const ctx = canvas.getContext('2d');

        // Destroy existing chart instance if it exists
        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
        }

        if (!Array.isArray(topProducts) || topProducts.length === 0) {
            topProductsContainer.innerHTML = '<p class="text-center text-gray-600 mt-4">No top selling products data available.</p>';
            return;
        }

        const productNames = topProducts.map(p => p.product_name);
        const quantities = topProducts.map(p => p.total_quantity_sold);

        topProductsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: productNames,
                datasets: [{
                    label: 'Units Sold',
                    data: quantities,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Units Sold'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Product Name'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top 5 Selling Products by Quantity'
                    }
                }
            }
        });
        // Hide loading message after chart is rendered
        topProductsContainer.querySelector('.loading-message').classList.add('hidden');
    }


    // --- Fetching Sales Forecast Data ---
    async function fetchSalesForecast() {
        // Clear previous content including chart canvas, and add loading message
        salesForecastContainer.innerHTML = `
            <canvas id="sales-forecast-chart"></canvas>
            <div class="loading-message text-center text-gray-600 mt-4">Loading sales forecast...</div>
        `;
        // errorMessage.classList.add('hidden'); // Handled by Promise.allSettled

        const forecastDays = forecastDaysInput.value;
        if (forecastDays < 1) {
            salesForecastContainer.innerHTML = '<p class="text-center text-red-500 mt-4">Please enter a positive number of days for forecast.</p>';
            return Promise.reject(new Error("Invalid forecast days")); // Indicate failure for Promise.allSettled
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analytics/forecast?days=${forecastDays}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const forecastData = await response.json();
            console.log('Fetched sales forecast data:', forecastData);
            displaySalesForecastChart(forecastData);
            return Promise.resolve(); // Indicate success for Promise.allSettled
        } catch (error) {
            console.error('Error fetching or processing sales forecast:', error);
            salesForecastContainer.innerHTML = '<p class="text-center text-red-500 mt-4">Failed to load sales forecast.</p>'; // Specific error message
            // errorMessage.classList.remove('hidden'); // Handled by Promise.allSettled
            return Promise.reject(error); // Indicate failure for Promise.allSettled
        }
    }

    // --- Displaying Sales Forecast Chart ---
    function displaySalesForecastChart(forecast) {
        // Ensure the canvas element exists before trying to get its context
        const canvas = document.getElementById('sales-forecast-chart');
        if (!canvas) {
            console.error('Sales forecast canvas element not found!');
            salesForecastContainer.innerHTML = '<p class="text-center text-red-500 mt-4">Chart display error: Canvas element missing.</p>';
            return;
        }
        const ctx = canvas.getContext('2d');

        // Destroy existing chart instance if it exists
        if (salesForecastChartInstance) {
            salesForecastChartInstance.destroy();
        }

        if (!Array.isArray(forecast) || forecast.length === 0) {
            salesForecastContainer.innerHTML = '<p class="text-center text-gray-600 mt-4">No sales forecast data available.</p>';
            return;
        }

        const dates = forecast.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const revenues = forecast.map(item => item.predicted_revenue.toFixed(2));

        salesForecastChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Predicted Revenue ($)',
                    data: revenues,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Sales Forecast'
                    }
                }
            }
        });
        // Hide loading message after chart is rendered
        salesForecastContainer.querySelector('.loading-message').classList.add('hidden');
    }

    // --- Fetching Inventory Recommendations Data ---
    async function fetchInventoryRecommendations() {
        inventoryRecommendationsContainer.innerHTML = '<div class="loading-message text-center text-gray-600">Loading inventory recommendations...</div>';
        // errorMessage.classList.add('hidden'); // Handled by Promise.allSettled

        try {
            const response = await fetch(`${API_BASE_URL}/analytics/inventory_recommendations`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const recommendationsData = await response.json();
            console.log('Fetched inventory recommendations data:', recommendationsData);
            displayInventoryRecommendations(recommendationsData);
            return Promise.resolve(); // Indicate success for Promise.allSettled
        } catch (error) {
            console.error('Error fetching or processing inventory recommendations:', error);
            inventoryRecommendationsContainer.innerHTML = '';
            // errorMessage.classList.remove('hidden'); // Handled by Promise.allSettled
            return Promise.reject(error); // Indicate failure for Promise.allSettled
        }
    }

    // --- Displaying Inventory Recommendations ---
    function displayInventoryRecommendations(recommendations) {
        inventoryRecommendationsContainer.innerHTML = '';

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
