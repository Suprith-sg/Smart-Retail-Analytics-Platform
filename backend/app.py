# backend/app.py

from flask import Flask, jsonify
import mysql.connector
from mysql.connector import Error
from config import DATABASE_CONFIG # Import database configuration

app = Flask(__name__)

# Function to establish database connection
def get_db_connection():
    try:
        conn = mysql.connector.connect(**DATABASE_CONFIG)
        if conn.is_connected():
            print("Successfully connected to MySQL database")
            return conn
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return None

# Route to get all products
@app.route('/products', methods=['GET'])
def get_products():
    conn = None
    cursor = None
    products = []
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True) # dictionary=True returns rows as dictionaries
            cursor.execute("SELECT product_id, product_name, category, brand, unit_price, sku FROM Products")
            products = cursor.fetchall()
            return jsonify(products)
    except Error as e:
        print(f"Error fetching products: {e}")
        return jsonify({"error": "Failed to fetch products"}), 500
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
    app.run(debug=True, port=5000) # Run on port 5000, debug=True for development
