-- Create a new database (schema) if it doesn't exist
CREATE DATABASE IF NOT EXISTS smart_retail_db;

-- Use the newly created database
USE smart_retail_db;

-- 1. Products Table
-- Stores information about each unique product sold.
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    sku VARCHAR(50) UNIQUE, -- Stock Keeping Unit, should be unique
    description VARCHAR(1000)
);

-- 2. Customers Table
-- Stores information about registered customers. Optional but good for personalized analytics.
CREATE TABLE Customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    address VARCHAR(500),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sales Table (Transactions Header)
-- Records summary information for each completed sales transaction.
CREATE TABLE Sales (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT, -- Can be NULL for guest customers
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50), -- e.g., 'Credit Card', 'Cash', 'UPI'
    store_id INT, -- If you have multiple store locations (could be FK to a Stores table if added later)
    -- Define foreign key constraint to Customers table
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

-- 4. SaleItems Table (Transaction Line Items)
-- Details individual products sold within a specific sales transaction.
CREATE TABLE SaleItems (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price_at_sale DECIMAL(10, 2) NOT NULL, -- Price at the time of sale (important for historical accuracy)
    item_total DECIMAL(12, 2) NOT NULL, -- Calculated: quantity * unit_price_at_sale
    -- Define foreign key constraint to Sales table
    FOREIGN KEY (transaction_id) REFERENCES Sales(transaction_id),
    -- Define foreign key constraint to Products table
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

-- 5. Inventory Table
-- Tracks the current stock levels of each product.
CREATE TABLE Inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE, -- Each product has one inventory record
    current_stock_quantity INT NOT NULL,
    reorder_level INT, -- Threshold at which to reorder
    last_updated_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    location VARCHAR(100), -- e.g., 'Warehouse A', 'Store Shelf 1'
    -- Define foreign key constraint to Products table
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
);

