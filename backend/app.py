# backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from config import DATABASE_CONFIG
from decimal import Decimal
import json
import os
import pickle
import pandas as pd
from datetime import timedelta # Import timedelta for date calculations

app = Flask(__name__)
CORS(app)

# Global variables to store the loaded model and min_sale_date
sales_forecast_model = None
min_sale_date = None

# Function to establish database connection
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        if conn.is_connected():
            # print("Successfully connected to MySQL database") # Commented to reduce log spam
            return conn
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return None

# Custom JSON encoder for Decimal objects
class CustomJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)

app.json_encoder = CustomJsonEncoder

# Function to load the trained model and min_sale_date
def load_ml_assets():
    global sales_forecast_model, min_sale_date
    model_path = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'sales_forecast_model.pkl')
    min_date_path = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'min_sale_date.pkl')

    try:
        if os.path.exists(model_path) and os.path.exists(min_date_path):
            with open(model_path, 'rb') as file:
                sales_forecast_model = pickle.load(file)
            with open(min_date_path, 'rb') as file:
                min_sale_date = pickle.load(file)
            print("Sales forecasting model and min_sale_date loaded successfully.")
        else:
            print("ML model files not found. Please run train_forecast_model.py first.")
    except Exception as e:
        print(f"Error loading ML model files: {e}")

# Call load_ml_assets when the app starts
with app.app_context():
    load_ml_assets()

# Route to get all products
@app.route('/products', methods=['GET'])
def get_products():
    conn = None
    cursor = None
    products = []
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT product_id, product_name, category, brand, unit_price, sku FROM Products")
            raw_products = cursor.fetchall()
            
            for product in raw_products:
                if 'unit_price' in product:
                    try:
                        product['unit_price'] = float(product['unit_price'])
                    except ValueError:
                        product['unit_price'] = 0.0
            
            return jsonify(raw_products)
    except Error as e:
        print(f"Error fetching products: {e}")
        return jsonify({"error": "Failed to fetch products"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Route: Get all sales transactions with item details
@app.route('/sales', methods=['GET'])
def get_sales():
    conn = None
    cursor = None
    sales = []
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT
                s.transaction_id,
                s.transaction_date,
                s.total_amount,
                s.payment_method,
                s.store_id,
                c.first_name AS customer_first_name,
                c.last_name AS customer_last_name,
                si.quantity,
                si.unit_price_at_sale,
                p.product_name,
                p.category AS product_category,
                p.brand AS product_brand
            FROM Sales s
            LEFT JOIN Customers c ON s.customer_id = c.customer_id
            JOIN SaleItems si ON s.transaction_id = si.transaction_id
            JOIN Products p ON si.product_id = p.product_id
            ORDER BY s.transaction_date DESC, s.transaction_id, p.product_name;
            """
            cursor.execute(query)
            raw_sales_data = cursor.fetchall()

            grouped_sales = {}
            for row in raw_sales_data:
                transaction_id = row['transaction_id']
                if transaction_id not in grouped_sales:
                    grouped_sales[transaction_id] = {
                        'transaction_id': row['transaction_id'],
                        'transaction_date': row['transaction_date'].isoformat(),
                        'total_amount': float(row['total_amount']),
                        'payment_method': row['payment_method'],
                        'store_id': row['store_id'],
                        'customer_name': f"{row['customer_first_name']} {row['customer_last_name']}" if row['customer_first_name'] else 'Guest',
                        'items': []
                    }
                item_data = {
                    'product_name': row['product_name'],
                    'product_category': row['product_category'],
                    'product_brand': row['product_brand'],
                    'quantity': row['quantity'],
                    'unit_price_at_sale': float(row['unit_price_at_sale'])
                }
                grouped_sales[transaction_id]['items'].append(item_data)
            sales = list(grouped_sales.values())
            return jsonify(sales)
    except Error as e:
        print(f"Error fetching sales data: {e}")
        return jsonify({"error": "Failed to fetch sales data"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Route: Get summary analytics
@app.route('/analytics/summary', methods=['GET'])
def get_summary_analytics():
    conn = None
    cursor = None
    summary_data = {}
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT SUM(total_amount) AS total_revenue FROM Sales")
            total_revenue = cursor.fetchone()['total_revenue']
            summary_data['total_revenue'] = float(total_revenue) if total_revenue else 0.0

            cursor.execute("SELECT SUM(quantity) AS total_products_sold FROM SaleItems")
            total_products_sold = cursor.fetchone()['total_products_sold']
            summary_data['total_products_sold'] = int(total_products_sold) if total_products_sold else 0

            cursor.execute("SELECT COUNT(DISTINCT transaction_id) AS total_transactions FROM Sales")
            total_transactions = cursor.fetchone()['total_transactions']
            summary_data['total_transactions'] = int(total_transactions) if total_transactions else 0

            cursor.execute("SELECT COUNT(DISTINCT customer_id) AS unique_customers FROM Sales WHERE customer_id IS NOT NULL")
            unique_customers = cursor.fetchone()['unique_customers']
            summary_data['unique_customers'] = int(unique_customers) if unique_customers else 0
            
            cursor.execute("""
                SELECT p.product_name, SUM(si.quantity) AS total_quantity_sold
                FROM SaleItems si
                JOIN Products p ON si.product_id = p.product_id
                GROUP BY p.product_name
                ORDER BY total_quantity_sold DESC
                LIMIT 5
            """)
            top_products = cursor.fetchall()
            summary_data['top_selling_products'] = top_products

            return jsonify(summary_data)
    except Error as e:
        print(f"Error fetching summary analytics: {e}")
        return jsonify({"error": "Failed to fetch summary analytics"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Route: Get sales forecast
@app.route('/analytics/forecast', methods=['GET'])
def get_sales_forecast():
    global sales_forecast_model, min_sale_date

    if sales_forecast_model is None or min_sale_date is None:
        return jsonify({"error": "Sales forecasting model not loaded. Please ensure it's trained and available."}), 500

    try:
        forecast_days_str = request.args.get('days', '7')
        try:
            forecast_days = int(forecast_days_str)
            if forecast_days <= 0:
                raise ValueError("Forecast days must be a positive integer.")
        except ValueError:
            return jsonify({"error": "Invalid 'days' parameter. Must be a positive integer."}), 400

        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute("SELECT MAX(transaction_date) AS latest_date FROM Sales")
                result = cursor.fetchone()
                if result and result['latest_date']:
                    last_sale_date = pd.to_datetime(result['latest_date']).normalize()
                else:
                    last_sale_date = pd.to_datetime(min_sale_date).normalize()

        except Error as e:
            print(f"Error fetching latest sale date: {e}")
            last_sale_date = pd.to_datetime(min_sale_date).normalize()
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


        forecast_dates = [last_sale_date + pd.Timedelta(days=i) for i in range(1, forecast_days + 1)]
        
        X_forecast = pd.DataFrame({
            'days_since_start': [(date - pd.to_datetime(min_sale_date)).days for date in forecast_dates]
        })

        predictions = sales_forecast_model.predict(X_forecast)

        forecast_results = []
        for i, date in enumerate(forecast_dates):
            forecast_results.append({
                'date': date.isoformat(),
                'predicted_revenue': float(max(0, predictions[i]))
            })
        
        return jsonify(forecast_results)

    except Exception as e:
        print(f"Error generating sales forecast: {e}")
        return jsonify({"error": "Failed to generate sales forecast"}), 500

# New Route: Get inventory recommendations
@app.route('/analytics/inventory_recommendations', methods=['GET'])
def get_inventory_recommendations():
    conn = None
    cursor = None
    recommendations = []
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)

            # Fetch current inventory and product details
            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.unit_price,
                    i.current_stock_quantity,
                    i.reorder_level
                FROM Inventory i
                JOIN Products p ON i.product_id = p.product_id
            """)
            inventory_data = cursor.fetchall()

            # Logic for reorder recommendations (simple example)
            # You would typically use the sales forecast here, but for simplicity,
            # we'll use a basic rule: if current stock is below reorder level, recommend reorder.
            # For a more advanced approach, you'd integrate the sales_forecast_model here.

            # Example: Fetch sales forecast for a short period (e.g., next 7 days)
            # This would be a more complex integration, possibly calling get_sales_forecast internally
            # For now, let's keep it simple based on reorder_level.
            # In a real scenario, you'd calculate forecasted demand per product.

            for item in inventory_data:
                product_id = item['product_id']
                product_name = item['product_name']
                current_stock = item['current_stock_quantity']
                reorder_level = item['reorder_level']
                unit_price = float(item['unit_price']) # Ensure float conversion

                # Simple reorder logic: if current stock is below reorder level
                if reorder_level is not None and current_stock < reorder_level:
                    # Recommend ordering enough to reach reorder_level + a buffer (e.g., 20 units)
                    # Or based on forecasted demand
                    recommended_quantity = reorder_level + 20 - current_stock # Example buffer
                    if recommended_quantity < 0: recommended_quantity = 0 # Ensure non-negative
                    
                    recommendations.append({
                        'product_id': product_id,
                        'product_name': product_name,
                        'current_stock': current_stock,
                        'reorder_level': reorder_level,
                        'recommended_reorder_quantity': int(recommended_quantity),
                        'estimated_cost': float(recommended_quantity * unit_price)
                    })
            
            return jsonify(recommendations)
    except Error as e:
        print(f"Error fetching inventory recommendations: {e}")
        return jsonify({"error": "Failed to fetch inventory recommendations"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Basic route for testing the server
@app.route('/')
def home():
    return "Welcome to the Smart Retail Analytics Backend API!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
